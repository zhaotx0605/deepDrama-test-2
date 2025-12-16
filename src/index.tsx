import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'

type Bindings = { DB: D1Database }

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic())

// ==================== 数据看板(剧本概览) API ====================

// 获取KPI指标 - 改为总剧本数
app.get('/api/dashboard/kpi', async (c) => {
  const db = c.env.DB
  const { start_date, end_date } = c.req.query()
  
  let dateFilter = ''
  const params: any[] = []
  
  if (start_date) {
    dateFilter += ' AND submit_date >= ?'
    params.push(start_date)
  }
  if (end_date) {
    dateFilter += ' AND submit_date <= ?'
    params.push(end_date)
  }

  const baseSql = `FROM scripts WHERE 1=1 ${dateFilter}`
  
  const [total, projects, rated, avgScore, pending] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count ${baseSql}`).bind(...params).first(),
    db.prepare(`SELECT COUNT(*) as count ${baseSql} AND is_project = 1`).bind(...params).first(),
    db.prepare(`SELECT COUNT(*) as count ${baseSql} AND rating_count > 0`).bind(...params).first(),
    db.prepare(`SELECT AVG(avg_score) as avg ${baseSql} AND avg_score > 0`).bind(...params).first(),
    db.prepare(`SELECT COUNT(*) as count ${baseSql} AND assign_status = '待分配'`).bind(...params).first()
  ])

  return c.json({
    totalScripts: total?.count || 0,
    projectCount: projects?.count || 0,
    ratedCount: rated?.count || 0,
    pendingAssign: pending?.count || 0,
    avgScore: avgScore?.avg ? Number(avgScore.avg).toFixed(1) : '0'
  })
})

// 状态分布
app.get('/api/dashboard/status-distribution', async (c) => {
  const db = c.env.DB
  const { start_date, end_date } = c.req.query()
  
  let sql = 'SELECT status, COUNT(*) as count FROM scripts WHERE 1=1'
  const params: any[] = []
  
  if (start_date) { sql += ' AND submit_date >= ?'; params.push(start_date) }
  if (end_date) { sql += ' AND submit_date <= ?'; params.push(end_date) }
  sql += ' GROUP BY status'
  
  const result = await db.prepare(sql).bind(...params).all()
  return c.json(result.results || [])
})

// 来源类型分布
app.get('/api/dashboard/source-distribution', async (c) => {
  const db = c.env.DB
  const { start_date, end_date } = c.req.query()
  
  let sql = 'SELECT source_type, COUNT(*) as count FROM scripts WHERE 1=1'
  const params: any[] = []
  
  if (start_date) { sql += ' AND submit_date >= ?'; params.push(start_date) }
  if (end_date) { sql += ' AND submit_date <= ?'; params.push(end_date) }
  sql += ' GROUP BY source_type'
  
  const result = await db.prepare(sql).bind(...params).all()
  return c.json(result.results || [])
})

// 团队分布
app.get('/api/dashboard/team-distribution', async (c) => {
  const db = c.env.DB
  const { start_date, end_date } = c.req.query()
  
  let sql = `SELECT content_team as team, COUNT(*) as count, AVG(avg_score) as avg_score 
             FROM scripts WHERE content_team IS NOT NULL AND content_team != ''`
  const params: any[] = []
  
  if (start_date) { sql += ' AND submit_date >= ?'; params.push(start_date) }
  if (end_date) { sql += ' AND submit_date <= ?'; params.push(end_date) }
  sql += ' GROUP BY content_team ORDER BY count DESC'
  
  const result = await db.prepare(sql).bind(...params).all()
  return c.json(result.results || [])
})

// ==================== 剧本管理 API ====================

// 获取剧本列表（支持Tab切换和筛选）
app.get('/api/scripts', async (c) => {
  const db = c.env.DB
  const { 
    tab, status, source_type, team, genre, content_team, producer_team,
    is_project, min_score, max_score, keyword, start_date, end_date,
    assign_status, page = '1', limit = '20', sort = 'avg_score', order = 'desc'
  } = c.req.query()
  
  let sql = 'SELECT * FROM scripts WHERE 1=1'
  const params: any[] = []
  
  // Tab切换筛选
  if (tab === 'pending') {
    sql += ' AND assign_status = ?'
    params.push('待分配')
  }
  
  // 其他筛选条件
  if (assign_status) { sql += ' AND assign_status = ?'; params.push(assign_status) }
  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (source_type) { sql += ' AND source_type = ?'; params.push(source_type) }
  if (team) { sql += ' AND team = ?'; params.push(team) }
  if (genre) { sql += ' AND genre = ?'; params.push(genre) }
  if (content_team) { sql += ' AND content_team = ?'; params.push(content_team) }
  if (producer_team) { sql += ' AND producer_team = ?'; params.push(producer_team) }
  if (is_project !== undefined && is_project !== '') {
    sql += ' AND is_project = ?'
    params.push(is_project === 'true' || is_project === '1' ? 1 : 0)
  }
  if (min_score) { sql += ' AND avg_score >= ?'; params.push(parseFloat(min_score)) }
  if (max_score) { sql += ' AND avg_score <= ?'; params.push(parseFloat(max_score)) }
  if (start_date) { sql += ' AND submit_date >= ?'; params.push(start_date) }
  if (end_date) { sql += ' AND submit_date <= ?'; params.push(end_date) }
  if (keyword) {
    sql += ' AND (name LIKE ? OR script_id LIKE ? OR writer LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  
  // 获取总数
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
  const countResult = await db.prepare(countSql).bind(...params).first()
  
  // 排序和分页
  const validSorts = ['avg_score', 'submit_date', 'rating_count', 'name', 'created_at']
  const sortField = validSorts.includes(sort) ? sort : 'avg_score'
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC'
  sql += ` ORDER BY ${sortField} ${sortOrder}, created_at DESC`
  
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  sql += ' LIMIT ? OFFSET ?'
  params.push(limitNum, (pageNum - 1) * limitNum)
  
  const result = await db.prepare(sql).bind(...params).all()
  
  return c.json({
    data: result.results || [],
    total: countResult?.total || 0,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil((countResult?.total || 0) / limitNum)
  })
})

// 获取单个剧本详情（含评分记录，按时间降序）
app.get('/api/scripts/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  const script = await db.prepare('SELECT * FROM scripts WHERE script_id = ? OR id = ?').bind(id, id).first()
  if (!script) return c.json({ error: '剧本不存在' }, 404)
  
  // 获取评分记录，按评分时间降序
  const ratings = await db.prepare(`
    SELECT r.*, u.role_type
    FROM ratings r
    LEFT JOIN users u ON r.user_id = u.user_id
    WHERE r.script_id = ?
    ORDER BY r.rating_date DESC, r.created_at DESC
  `).bind(script.script_id).all()
  
  return c.json({ ...script, ratings: ratings.results || [] })
})

// 创建剧本
app.post('/api/scripts', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  const lastScript = await db.prepare('SELECT script_id FROM scripts ORDER BY id DESC LIMIT 1').first()
  let nextNum = 1
  if (lastScript?.script_id) {
    const match = String(lastScript.script_id).match(/SP(\d+)/)
    if (match) nextNum = parseInt(match[1]) + 1
  }
  const scriptId = `SP${String(nextNum).padStart(3, '0')}`
  
  await db.prepare(`
    INSERT INTO scripts (script_id, name, preview, file_url, tags, source_type, team, status, genre, content_type, 
    is_project, project_owner, project_name, remarks, submit_user, writer, content_team, producer, producer_team, 
    feishu_url, assign_status, submit_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    scriptId, body.name, body.preview || null, body.file_url || null,
    body.tags ? JSON.stringify(body.tags) : null, body.source_type || '内部团队',
    body.team || null, body.status || '一卡初稿', body.genre || '皆可', body.content_type || '付费',
    body.is_project ? 1 : 0, body.project_owner || null, body.project_name || null,
    body.remarks || null, body.submit_user || null, body.writer || null,
    body.content_team || null, body.producer || null, body.producer_team || null,
    body.feishu_url || null, body.assign_status || '待分配', body.submit_date || new Date().toISOString().split('T')[0]
  ).run()
  
  return c.json({ success: true, script_id: scriptId })
})

// 更新剧本
app.put('/api/scripts/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const updates: string[] = []
  const params: any[] = []
  
  const fields = ['name', 'preview', 'file_url', 'tags', 'source_type', 'team', 'status', 'genre', 
    'content_type', 'is_project', 'project_owner', 'project_name', 'remarks', 'production_status',
    'writer', 'content_team', 'producer', 'producer_team', 'feishu_url', 'assign_status']
  
  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`)
      if (field === 'tags' && Array.isArray(body[field])) {
        params.push(JSON.stringify(body[field]))
      } else if (field === 'is_project') {
        params.push(body[field] ? 1 : 0)
      } else {
        params.push(body[field])
      }
    }
  }
  
  if (updates.length === 0) return c.json({ error: '没有需要更新的字段' }, 400)
  
  updates.push('updated_at = CURRENT_TIMESTAMP')
  const sql = `UPDATE scripts SET ${updates.join(', ')} WHERE script_id = ? OR id = ?`
  params.push(id, id)
  
  await db.prepare(sql).bind(...params).run()
  return c.json({ success: true })
})

// 删除剧本
app.delete('/api/scripts/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  await db.prepare('DELETE FROM ratings WHERE script_id = ?').bind(id).run()
  await db.prepare('DELETE FROM scripts WHERE script_id = ? OR id = ?').bind(id, id).run()
  
  return c.json({ success: true })
})

// ==================== 评分 API ====================

// 获取评分记录
app.get('/api/ratings', async (c) => {
  const db = c.env.DB
  const { script_id, user_id, start_date, end_date, min_score, max_score, page = '1', limit = '20' } = c.req.query()
  
  let sql = `
    SELECT r.*, s.name as script_name, s.status as script_status, s.avg_score as script_avg_score, u.role_type
    FROM ratings r
    LEFT JOIN scripts s ON r.script_id = s.script_id
    LEFT JOIN users u ON r.user_id = u.user_id
    WHERE 1=1
  `
  const params: any[] = []
  
  if (script_id) { sql += ' AND r.script_id = ?'; params.push(script_id) }
  if (user_id) { sql += ' AND r.user_id = ?'; params.push(user_id) }
  if (start_date) { sql += ' AND r.rating_date >= ?'; params.push(start_date) }
  if (end_date) { sql += ' AND r.rating_date <= ?'; params.push(end_date) }
  if (min_score) { sql += ' AND r.total_score >= ?'; params.push(parseFloat(min_score)) }
  if (max_score) { sql += ' AND r.total_score <= ?'; params.push(parseFloat(max_score)) }
  
  const countSql = sql.replace(/SELECT r\.\*, s\.name.*FROM/, 'SELECT COUNT(*) as total FROM')
  const countResult = await db.prepare(countSql).bind(...params).first()
  
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  sql += ' ORDER BY r.rating_date DESC, r.created_at DESC LIMIT ? OFFSET ?'
  params.push(limitNum, (pageNum - 1) * limitNum)
  
  const result = await db.prepare(sql).bind(...params).all()
  
  return c.json({ data: result.results || [], total: countResult?.total || 0, page: pageNum, limit: limitNum })
})

// 创建评分
app.post('/api/ratings', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  const scores = [body.content_score, body.market_score, body.compliance_score, body.commercial_score].filter(s => s !== null && s !== undefined)
  const totalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  
  // 获取用户角色
  const user = await db.prepare('SELECT role_type FROM users WHERE user_id = ?').bind(body.user_id).first()
  
  await db.prepare(`
    INSERT INTO ratings (script_id, user_id, user_name, user_role, content_score, market_score, compliance_score, commercial_score, total_score, comments, rating_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.script_id, body.user_id, body.user_name, user?.role_type || body.user_role || '评审',
    body.content_score ?? null, body.market_score ?? null, body.compliance_score ?? null, body.commercial_score ?? null,
    totalScore, body.comments || null, body.rating_date || new Date().toISOString().split('T')[0]
  ).run()
  
  // 更新剧本平均分
  await updateScriptAvgScore(db, body.script_id)
  
  return c.json({ success: true })
})

// 更新评分
app.put('/api/ratings/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const existing = await db.prepare('SELECT is_locked, script_id FROM ratings WHERE id = ?').bind(id).first()
  if (existing?.is_locked) return c.json({ error: '该评分记录已锁定' }, 403)
  
  const scores = [body.content_score, body.market_score, body.compliance_score, body.commercial_score].filter(s => s !== null && s !== undefined)
  const totalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  
  await db.prepare(`
    UPDATE ratings SET content_score = ?, market_score = ?, compliance_score = ?, commercial_score = ?, total_score = ?, comments = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(body.content_score ?? null, body.market_score ?? null, body.compliance_score ?? null, body.commercial_score ?? null, totalScore, body.comments || null, id).run()
  
  if (existing?.script_id) await updateScriptAvgScore(db, String(existing.script_id))
  
  return c.json({ success: true })
})

async function updateScriptAvgScore(db: D1Database, scriptId: string) {
  const avgResult = await db.prepare(`
    SELECT AVG(total_score) as avg, COUNT(*) as count FROM ratings WHERE script_id = ? AND total_score IS NOT NULL
  `).bind(scriptId).first()
  
  await db.prepare(`UPDATE scripts SET avg_score = ?, rating_count = ?, updated_at = CURRENT_TIMESTAMP WHERE script_id = ?`)
    .bind(avgResult?.avg || 0, avgResult?.count || 0, scriptId).run()
}

// ==================== 排行榜 API ====================
app.get('/api/rankings', async (c) => {
  const db = c.env.DB
  
  const result = await db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM ratings r WHERE r.script_id = s.script_id) as rater_count,
      (SELECT AVG(content_score) FROM ratings r WHERE r.script_id = s.script_id AND content_score IS NOT NULL) as avg_content_score,
      (SELECT AVG(market_score) FROM ratings r WHERE r.script_id = s.script_id AND market_score IS NOT NULL) as avg_market_score,
      (SELECT AVG(commercial_score) FROM ratings r WHERE r.script_id = s.script_id AND commercial_score IS NOT NULL) as avg_commercial_score
    FROM scripts s WHERE s.avg_score > 0 ORDER BY s.avg_score DESC LIMIT 50
  `).all()
  
  const rankings = (result.results || []).map((item: any, index: number) => ({
    ...item, rank: index + 1,
    medal: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null,
    rating: item.avg_score >= 90 ? 'S' : item.avg_score >= 80 ? 'A' : item.avg_score >= 70 ? 'B+' : item.avg_score >= 60 ? 'B' : item.avg_score >= 50 ? 'C+' : 'C'
  }))
  
  return c.json(rankings)
})

// ==================== 用户和选项 API ====================
app.get('/api/users', async (c) => {
  const db = c.env.DB
  const result = await db.prepare('SELECT * FROM users ORDER BY name').all()
  return c.json(result.results || [])
})

app.get('/api/options', async (c) => {
  const db = c.env.DB
  
  const [teams, statuses, sourceTypes, genres, contentTeams, producerTeams, writers, producers] = await Promise.all([
    db.prepare('SELECT DISTINCT team FROM scripts WHERE team IS NOT NULL AND team != "" ORDER BY team').all(),
    db.prepare('SELECT DISTINCT status FROM scripts ORDER BY status').all(),
    db.prepare('SELECT DISTINCT source_type FROM scripts ORDER BY source_type').all(),
    db.prepare('SELECT DISTINCT genre FROM scripts ORDER BY genre').all(),
    db.prepare('SELECT DISTINCT content_team FROM scripts WHERE content_team IS NOT NULL ORDER BY content_team').all(),
    db.prepare('SELECT DISTINCT producer_team FROM scripts WHERE producer_team IS NOT NULL ORDER BY producer_team').all(),
    db.prepare('SELECT DISTINCT writer FROM scripts WHERE writer IS NOT NULL ORDER BY writer').all(),
    db.prepare('SELECT DISTINCT producer FROM scripts WHERE producer IS NOT NULL ORDER BY producer').all()
  ])
  
  return c.json({
    teams: (teams.results || []).map((r: any) => r.team),
    statuses: (statuses.results || []).map((r: any) => r.status),
    sourceTypes: (sourceTypes.results || []).map((r: any) => r.source_type),
    genres: (genres.results || []).map((r: any) => r.genre),
    contentTeams: (contentTeams.results || []).map((r: any) => r.content_team),
    producerTeams: (producerTeams.results || []).map((r: any) => r.producer_team),
    writers: (writers.results || []).map((r: any) => r.writer),
    producers: (producers.results || []).map((r: any) => r.producer)
  })
})

// ==================== 前端页面 ====================
app.get('/*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeepDrama - 短剧内容评分系统</title>
  <link rel="stylesheet" href="https://unpkg.com/@arco-design/web-vue@2.55.0/dist/arco.css">
  <script src="https://unpkg.com/vue@3.4.21/dist/vue.global.prod.js"><\/script>
  <script src="https://unpkg.com/@arco-design/web-vue@2.55.0/dist/arco-vue.min.js"><\/script>
  <script src="https://unpkg.com/@arco-design/web-vue@2.55.0/dist/arco-vue-icon.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif; background: #f5f7fa; }
    .layout { display: flex; min-height: 100vh; }
    .sidebar { width: 220px; background: linear-gradient(180deg, #1d2129 0%, #232931 100%); position: fixed; height: 100vh; z-index: 100; }
    .sidebar-logo { padding: 20px; color: #fff; font-size: 20px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; }
    .sidebar-menu { padding: 12px 0; }
    .menu-item { display: flex; align-items: center; padding: 14px 24px; color: rgba(255,255,255,0.7); cursor: pointer; transition: all 0.2s; gap: 12px; }
    .menu-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .menu-item.active { background: linear-gradient(90deg, #165dff 0%, #0e42d2 100%); color: #fff; }
    .main-content { margin-left: 220px; flex: 1; padding: 24px; min-height: 100vh; }
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 22px; font-weight: 600; color: #1d2129; }
    .page-desc { color: #86909c; margin-top: 4px; font-size: 14px; }
    .stat-card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .stat-card-title { color: #86909c; font-size: 14px; margin-bottom: 8px; }
    .stat-card-value { font-size: 28px; font-weight: 600; color: #1d2129; }
    .chart-card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .chart-title { font-size: 16px; font-weight: 500; color: #1d2129; margin-bottom: 16px; }
    .filter-bar { background: #fff; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .table-card { background: #fff; border-radius: 8px; padding: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; }
    .project-badge { display: inline-flex; align-items: center; gap: 4px; background: #e8f3ff; color: #165dff; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .role-tag { font-size: 11px; padding: 1px 6px; border-radius: 3px; margin-left: 6px; display: inline-block; }
    .role-tag.主编 { background: #fff7e8; color: #ff7d00; }
    .role-tag.制片 { background: #e8f7ff; color: #0fc6c2; }
    .role-tag.评审 { background: #f0f0f0; color: #86909c; }
    .role-tag.内容 { background: #e8f3ff; color: #165dff; }
    .rating-drawer-content { padding: 0 20px; }
    .rating-item { border-bottom: 1px solid #e5e6eb; padding: 16px 0; }
    .rating-item:last-child { border-bottom: none; }
    .rating-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .rating-user { display: flex; align-items: center; gap: 8px; }
    .rating-scores { display: flex; gap: 16px; color: #86909c; font-size: 13px; }
    .score-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 600; color: #fff; font-size: 13px; }
    .score-s { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .score-a { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .score-b { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .score-c { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); color: #333; }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; width: 100%; padding-right: 10px; }
    .script-info-card { background: #f7f8fa; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .script-info-row { display: flex; margin-bottom: 8px; }
    .script-info-label { color: #86909c; width: 80px; flex-shrink: 0; }
    .script-info-value { color: #1d2129; flex: 1; }
  </style>
</head>
<body>
  <div id="app">
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <icon-film /> DeepDrama
        </div>
        <nav class="sidebar-menu">
          <div class="menu-item" :class="{ active: currentPage === 'dashboard' }" @click="currentPage = 'dashboard'">
            <icon-dashboard /> 剧本概览
          </div>
          <div class="menu-item" :class="{ active: currentPage === 'scripts' }" @click="currentPage = 'scripts'">
            <icon-file /> 剧本管理
          </div>
          <div class="menu-item" :class="{ active: currentPage === 'ratings' }" @click="currentPage = 'ratings'">
            <icon-star /> 评分记录
          </div>
          <div class="menu-item" :class="{ active: currentPage === 'rankings' }" @click="currentPage = 'rankings'">
            <icon-trophy /> 剧本排行
          </div>
        </nav>
      </aside>
      
      <main class="main-content">
        <!-- 剧本概览 -->
        <div v-if="currentPage === 'dashboard'">
          <div class="page-header">
            <h1 class="page-title">剧本概览</h1>
            <p class="page-desc">实时数据统计与可视化分析</p>
          </div>
          
          <a-space direction="vertical" fill style="margin-bottom: 20px;">
            <a-card :bordered="false">
              <a-space>
                <span style="color: #86909c;">投稿日期：</span>
                <a-range-picker v-model="dateRange" @change="loadDashboard" allow-clear style="width: 260px;" placeholder="['不限', '不限']" />
              </a-space>
            </a-card>
          </a-space>
          
          <a-row :gutter="20" style="margin-bottom: 20px;">
            <a-col :span="6">
              <div class="stat-card">
                <div class="stat-card-title">总剧本数</div>
                <div class="stat-card-value" style="color: #165dff;">{{ kpi.totalScripts }}</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div class="stat-card">
                <div class="stat-card-title">立项数</div>
                <div class="stat-card-value" style="color: #00b42a;">{{ kpi.projectCount }}</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div class="stat-card">
                <div class="stat-card-title">待分配</div>
                <div class="stat-card-value" style="color: #ff7d00;">{{ kpi.pendingAssign }}</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div class="stat-card">
                <div class="stat-card-title">平均评分</div>
                <div class="stat-card-value" style="color: #722ed1;">{{ kpi.avgScore }}</div>
              </div>
            </a-col>
          </a-row>
          
          <a-row :gutter="20">
            <a-col :span="12">
              <div class="chart-card">
                <div class="chart-title">剧本状态分布</div>
                <div id="status-chart" style="height: 300px;"></div>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="chart-card">
                <div class="chart-title">内容团队统计</div>
                <div id="team-chart" style="height: 300px;"></div>
              </div>
            </a-col>
          </a-row>
        </div>
        
        <!-- 剧本管理 -->
        <div v-if="currentPage === 'scripts'">
          <div class="page-header">
            <h1 class="page-title">剧本管理</h1>
            <p class="page-desc">管理和筛选所有剧本</p>
          </div>
          
          <a-tabs v-model:active-key="scriptTab" @change="loadScripts">
            <a-tab-pane key="all" title="全部" />
            <a-tab-pane key="pending" title="待分配" />
          </a-tabs>
          
          <div class="filter-bar">
            <a-space wrap>
              <a-select v-model="scriptFilters.status" placeholder="剧本状态" allow-clear style="width: 130px;" @change="loadScripts">
                <a-option v-for="s in options.statuses" :key="s" :value="s">{{ s }}</a-option>
              </a-select>
              <a-select v-model="scriptFilters.content_team" placeholder="内容团队" allow-clear style="width: 130px;" @change="loadScripts">
                <a-option v-for="t in options.contentTeams" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
              <a-select v-model="scriptFilters.genre" placeholder="内容类型" allow-clear style="width: 130px;" @change="loadScripts">
                <a-option value="男频">男频</a-option>
                <a-option value="女频">女频</a-option>
                <a-option value="皆可">皆可</a-option>
              </a-select>
              <a-input-search v-model="scriptFilters.keyword" placeholder="搜索剧本/编剧" allow-clear style="width: 200px;" @search="loadScripts" @press-enter="loadScripts" />
              <a-range-picker v-model="scriptDateRange" @change="loadScripts" allow-clear placeholder="['投稿开始', '投稿结束']" style="width: 260px;" />
            </a-space>
          </div>
          
          <div class="table-card">
            <a-table :data="scripts" :pagination="pagination" :loading="loading" @page-change="onPageChange" row-key="script_id">
              <template #columns>
                <a-table-column title="编号" data-index="script_id" :width="90" />
                <a-table-column title="剧本名称" :width="200">
                  <template #cell="{ record }">
                    <div style="font-weight: 500;">{{ record.name }}</div>
                    <div style="font-size: 12px; color: #86909c;">{{ record.genre }} · {{ record.content_type }}</div>
                  </template>
                </a-table-column>
                <a-table-column title="编剧" data-index="writer" :width="90" />
                <a-table-column title="内容团队" data-index="content_team" :width="100" />
                <a-table-column title="制片" data-index="producer" :width="90" />
                <a-table-column title="制片团队" data-index="producer_team" :width="100" />
                <a-table-column title="评分" :width="80" align="center">
                  <template #cell="{ record }">
                    <span :class="'score-badge score-' + getScoreClass(record.avg_score)">{{ record.avg_score?.toFixed(1) || '-' }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="状态" data-index="status" :width="100">
                  <template #cell="{ record }">
                    <a-tag size="small" :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="立项" :width="160" align="center">
                  <template #cell="{ record }">
                    <div v-if="record.is_project" class="project-badge">
                      ✅ {{ record.script_id }} {{ record.project_name || record.project_owner }}
                    </div>
                    <span v-else style="color: #c9cdd4;">-</span>
                  </template>
                </a-table-column>
                <a-table-column title="操作" :width="220" align="center" fixed="right">
                  <template #cell="{ record }">
                    <a-space>
                      <a-button type="text" size="small" @click="openFeishu(record)">
                        <template #icon><icon-file /></template>看剧本
                      </a-button>
                      <a-button type="text" size="small" status="warning" @click="openRatingDrawer(record)">
                        <template #icon><icon-star /></template>去评分
                      </a-button>
                      <a-button type="text" size="small" @click="openEditModal(record)">
                        <template #icon><icon-edit /></template>
                      </a-button>
                      <a-popconfirm content="确定删除该剧本？此操作不可恢复" @ok="deleteScript(record.script_id)">
                        <a-button type="text" size="small" status="danger">
                          <template #icon><icon-delete /></template>
                        </a-button>
                      </a-popconfirm>
                    </a-space>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </div>
        </div>
        
        <!-- 评分记录 -->
        <div v-if="currentPage === 'ratings'">
          <div class="page-header">
            <h1 class="page-title">评分记录</h1>
            <p class="page-desc">查看和管理所有评分记录</p>
          </div>
          
          <div class="filter-bar">
            <a-space wrap>
              <a-select v-model="ratingFilters.user_id" placeholder="评分人" allow-clear style="width: 150px;" @change="loadRatings">
                <a-option v-for="u in users" :key="u.user_id" :value="u.user_id">{{ u.name }}</a-option>
              </a-select>
              <a-range-picker v-model="ratingDateRange" @change="loadRatings" allow-clear style="width: 260px;" />
            </a-space>
          </div>
          
          <div class="table-card">
            <a-table :data="ratings" :pagination="ratingPagination" :loading="loading" @page-change="onRatingPageChange" row-key="id">
              <template #columns>
                <a-table-column title="剧本" :width="200">
                  <template #cell="{ record }">
                    <div style="font-weight: 500;">{{ record.script_name || record.script_id }}</div>
                  </template>
                </a-table-column>
                <a-table-column title="评分人" :width="140">
                  <template #cell="{ record }">
                    {{ record.user_name }}
                    <span :class="'role-tag ' + (record.role_type || record.user_role)">{{ record.role_type || record.user_role }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="内容" data-index="content_score" :width="80" align="center" />
                <a-table-column title="题材" data-index="market_score" :width="80" align="center" />
                <a-table-column title="制作" data-index="commercial_score" :width="80" align="center" />
                <a-table-column title="综合" :width="80" align="center">
                  <template #cell="{ record }">
                    <span style="font-weight: 600; color: #165dff;">{{ record.total_score?.toFixed(1) || '-' }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="评分时间" data-index="rating_date" :width="120" />
                <a-table-column title="评语" :width="200">
                  <template #cell="{ record }">
                    <a-tooltip v-if="record.comments" :content="record.comments">
                      <span style="color: #86909c; cursor: pointer;">{{ record.comments?.slice(0, 20) }}{{ record.comments?.length > 20 ? '...' : '' }}</span>
                    </a-tooltip>
                    <span v-else style="color: #c9cdd4;">-</span>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </div>
        </div>
        
        <!-- 排行榜 -->
        <div v-if="currentPage === 'rankings'">
          <div class="page-header">
            <h1 class="page-title">剧本排行榜</h1>
            <p class="page-desc">TOP 50 高分剧本</p>
          </div>
          
          <div class="table-card">
            <a-table :data="rankings" :pagination="false" row-key="script_id">
              <template #columns>
                <a-table-column title="排名" :width="80" align="center">
                  <template #cell="{ record }">
                    <span v-if="record.medal" style="font-size: 24px;">{{ record.medal }}</span>
                    <span v-else style="font-size: 16px; color: #86909c;">#{{ record.rank }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="剧本名称" :width="250">
                  <template #cell="{ record }">
                    <div style="font-weight: 500;">{{ record.name }}</div>
                    <div style="font-size: 12px; color: #86909c;">{{ record.script_id }} · {{ record.content_team || record.team }}</div>
                  </template>
                </a-table-column>
                <a-table-column title="评分" :width="100" align="center">
                  <template #cell="{ record }">
                    <span :class="'score-badge score-' + getScoreClass(record.avg_score)">{{ record.avg_score?.toFixed(1) }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="评分人数" data-index="rater_count" :width="100" align="center" />
                <a-table-column title="内容均分" :width="100" align="center">
                  <template #cell="{ record }">{{ record.avg_content_score?.toFixed(1) || '-' }}</template>
                </a-table-column>
                <a-table-column title="题材均分" :width="100" align="center">
                  <template #cell="{ record }">{{ record.avg_market_score?.toFixed(1) || '-' }}</template>
                </a-table-column>
                <a-table-column title="制作均分" :width="100" align="center">
                  <template #cell="{ record }">{{ record.avg_commercial_score?.toFixed(1) || '-' }}</template>
                </a-table-column>
                <a-table-column title="操作" :width="120" align="center">
                  <template #cell="{ record }">
                    <a-button type="text" size="small" @click="goToScriptDetail(record)">查看详情</a-button>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </div>
        </div>
      </main>
    </div>
    
    <!-- 评分抽屉 - 宽度改为页面1/3 -->
    <a-drawer :visible="ratingDrawerVisible" :width="'33%'" placement="right" @cancel="ratingDrawerVisible = false" unmount-on-close>
      <template #title>
        <div class="drawer-header">
          <span style="font-weight: 600;">评分详情</span>
          <a-button type="primary" size="small" @click="openRatingModal">去评分</a-button>
        </div>
      </template>
      <div class="rating-drawer-content" v-if="currentScript">
        <div class="script-info-card">
          <h3 style="margin-bottom: 12px; font-size: 18px;">{{ currentScript.name }}</h3>
          <div class="script-info-row">
            <span class="script-info-label">编号：</span>
            <span class="script-info-value">{{ currentScript.script_id }}</span>
          </div>
          <div class="script-info-row">
            <span class="script-info-label">编剧：</span>
            <span class="script-info-value">{{ currentScript.writer || '-' }}</span>
          </div>
          <div class="script-info-row">
            <span class="script-info-label">内容团队：</span>
            <span class="script-info-value">{{ currentScript.content_team || '-' }}</span>
          </div>
          <div class="script-info-row">
            <span class="script-info-label">内容类型：</span>
            <span class="script-info-value">{{ currentScript.genre }} · {{ currentScript.content_type }}</span>
          </div>
          <div class="script-info-row">
            <span class="script-info-label">状态：</span>
            <span class="script-info-value"><a-tag size="small" :color="getStatusColor(currentScript.status)">{{ currentScript.status }}</a-tag></span>
          </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; color: #fff;">
          <div style="font-size: 13px; margin-bottom: 8px; opacity: 0.9;">综合评分</div>
          <div style="font-size: 42px; font-weight: 700;">{{ currentScript.avg_score?.toFixed(1) || '-' }}</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">共 {{ currentScript.ratings?.length || 0 }} 人评分</div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h4 style="margin: 0;">评分记录</h4>
        </div>
        
        <div v-if="!currentScript.ratings?.length" style="text-align: center; padding: 40px 0; color: #86909c;">
          <icon-inbox style="font-size: 48px; margin-bottom: 12px;" />
          <div>暂无评分记录</div>
        </div>
        
        <div v-for="r in currentScript.ratings" :key="r.id" class="rating-item">
          <div class="rating-header">
            <div class="rating-user">
              <a-avatar :size="28" style="background: #165dff;">{{ r.user_name?.charAt(0) }}</a-avatar>
              <span style="font-weight: 500;">{{ r.user_name }}</span>
              <span :class="'role-tag ' + (r.role_type || r.user_role)">{{ r.role_type || r.user_role }}</span>
            </div>
            <span style="font-weight: 600; font-size: 18px;" :style="{ color: getScoreColor(r.total_score) }">{{ r.total_score?.toFixed(1) }}</span>
          </div>
          <div class="rating-scores">
            <span><icon-heart style="margin-right: 4px;" />内容: {{ r.content_score || '-' }}</span>
            <span><icon-bulb style="margin-right: 4px;" />题材: {{ r.market_score || '-' }}</span>
            <span><icon-tool style="margin-right: 4px;" />制作: {{ r.commercial_score || '-' }}</span>
          </div>
          <div style="color: #86909c; font-size: 12px; margin-top: 8px;"><icon-calendar style="margin-right: 4px;" />{{ r.rating_date }}</div>
          <div v-if="r.comments" style="color: #4e5969; font-size: 13px; margin-top: 10px; padding: 12px; background: #f7f8fa; border-radius: 6px; line-height: 1.6;">{{ r.comments }}</div>
        </div>
      </div>
    </a-drawer>
    
    <!-- 评分弹框 -->
    <a-modal v-model:visible="ratingModalVisible" title="提交评分" @ok="submitRating" :ok-loading="submitting" ok-text="提交" cancel-text="取消">
      <a-form :model="ratingForm" layout="vertical">
        <a-form-item label="评分人" required>
          <a-select v-model="ratingForm.user_id" placeholder="选择评分人">
            <a-option v-for="u in users" :key="u.user_id" :value="u.user_id">{{ u.name }} ({{ u.role_type }})</a-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="内容评分">
              <a-input-number v-model="ratingForm.content_score" :min="0" :max="100" placeholder="0-100" style="width: 100%;" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="题材评分">
              <a-input-number v-model="ratingForm.market_score" :min="0" :max="100" placeholder="0-100" style="width: 100%;" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="制作评分">
              <a-input-number v-model="ratingForm.commercial_score" :min="0" :max="100" placeholder="0-100" style="width: 100%;" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="评分意见">
          <a-textarea v-model="ratingForm.comments" placeholder="请输入评分意见（选填）" :auto-size="{ minRows: 3, maxRows: 6 }" />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <!-- 编辑剧本弹框 -->
    <a-modal v-model:visible="editModalVisible" title="编辑剧本" @ok="submitEditScript" :ok-loading="submitting" ok-text="保存" cancel-text="取消" :width="600">
      <a-form :model="editForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="剧本名称" required>
              <a-input v-model="editForm.name" placeholder="请输入剧本名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="飞书文档地址">
              <a-input v-model="editForm.feishu_url" placeholder="请输入飞书文档URL" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="来源类型">
              <a-select v-model="editForm.source_type" placeholder="选择来源类型">
                <a-option value="内部团队">内部团队</a-option>
                <a-option value="外部投稿">外部投稿</a-option>
                <a-option value="合作编剧">合作编剧</a-option>
                <a-option value="版权采购">版权采购</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属团队">
              <a-select v-model="editForm.team" placeholder="选择团队" allow-clear>
                <a-option v-for="t in options.teams" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="剧本状态">
              <a-select v-model="editForm.status" placeholder="选择状态">
                <a-option value="一卡初稿">一卡初稿</a-option>
                <a-option value="改稿中">改稿中</a-option>
                <a-option value="完整剧本">完整剧本</a-option>
                <a-option value="终稿">终稿</a-option>
                <a-option value="一卡">一卡</a-option>
                <a-option value="全本">全本</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="内容类型">
              <a-select v-model="editForm.genre" placeholder="选择内容类型">
                <a-option value="男频">男频</a-option>
                <a-option value="女频">女频</a-option>
                <a-option value="皆可">皆可</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="所属编剧">
              <a-select v-model="editForm.writer" placeholder="选择编剧" allow-clear>
                <a-option v-for="w in options.writers" :key="w" :value="w">{{ w }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="内容团队">
              <a-select v-model="editForm.content_team" placeholder="选择内容团队" allow-clear>
                <a-option v-for="t in options.contentTeams" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="所属制片">
              <a-select v-model="editForm.producer" placeholder="选择制片" allow-clear>
                <a-option v-for="p in options.producers" :key="p" :value="p">{{ p }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="制片团队">
              <a-select v-model="editForm.producer_team" placeholder="选择制片团队" allow-clear>
                <a-option v-for="t in options.producerTeams" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="分配状态">
              <a-select v-model="editForm.assign_status" placeholder="选择分配状态">
                <a-option value="待分配">待分配</a-option>
                <a-option value="已分配">已分配</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="立项状态">
              <a-switch v-model="editForm.is_project" />
              <span style="margin-left: 8px; color: #86909c;">{{ editForm.is_project ? '已立项' : '未立项' }}</span>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="立项名称" v-if="editForm.is_project">
          <a-input v-model="editForm.project_name" placeholder="请输入立项项目名称" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model="editForm.remarks" placeholder="请输入备注信息" :auto-size="{ minRows: 2 }" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
  
  <script>
    const { createApp, ref, reactive, onMounted, watch, nextTick, computed } = Vue;
    const ArcoVue = window.ArcoVue;
    const ArcoVueIcon = window.ArcoVueIcon;
    
    const app = createApp({
      setup() {
        const currentPage = ref('dashboard');
        const loading = ref(false);
        const submitting = ref(false);
        
        // 数据
        const kpi = ref({ totalScripts: 0, projectCount: 0, pendingAssign: 0, avgScore: '0' });
        const scripts = ref([]);
        const ratings = ref([]);
        const rankings = ref([]);
        const users = ref([]);
        const options = ref({ statuses: [], contentTeams: [], genres: [], teams: [], writers: [], producers: [], producerTeams: [] });
        
        // 筛选
        const dateRange = ref([]);
        const scriptTab = ref('all');
        const scriptFilters = reactive({ status: '', content_team: '', genre: '', keyword: '' });
        const scriptDateRange = ref([]);
        const ratingFilters = reactive({ user_id: '' });
        const ratingDateRange = ref([]);
        
        // 分页
        const pagination = reactive({ current: 1, pageSize: 20, total: 0, showTotal: true });
        const ratingPagination = reactive({ current: 1, pageSize: 20, total: 0, showTotal: true });
        
        // 抽屉和弹框
        const ratingDrawerVisible = ref(false);
        const ratingModalVisible = ref(false);
        const editModalVisible = ref(false);
        const currentScript = ref(null);
        const ratingForm = reactive({ user_id: '', content_score: null, market_score: null, compliance_score: null, commercial_score: null, comments: '' });
        const editForm = reactive({ 
          script_id: '', name: '', feishu_url: '', source_type: '', team: '', status: '', 
          genre: '', writer: '', content_team: '', producer: '', producer_team: '', 
          assign_status: '', is_project: false, project_name: '', remarks: '' 
        });
        
        // 工具函数
        const getScoreClass = (score) => { if (!score) return 'c'; if (score >= 80) return 's'; if (score >= 70) return 'a'; if (score >= 60) return 'b'; return 'c'; };
        const getScoreColor = (score) => { if (!score) return '#86909c'; if (score >= 80) return '#722ed1'; if (score >= 70) return '#165dff'; if (score >= 60) return '#00b42a'; return '#ff7d00'; };
        const getStatusColor = (status) => { 
          const map = { '一卡初稿': 'blue', '改稿中': 'orange', '完整剧本': 'green', '终稿': 'purple', '一卡': 'blue', '全本': 'green' }; 
          return map[status] || 'gray'; 
        };
        
        // API
        const loadDashboard = async () => {
          const params = new URLSearchParams();
          if (dateRange.value?.[0]) params.set('start_date', dayjs(dateRange.value[0]).format('YYYY-MM-DD'));
          if (dateRange.value?.[1]) params.set('end_date', dayjs(dateRange.value[1]).format('YYYY-MM-DD'));
          
          const [kpiRes, statusRes, teamRes] = await Promise.all([
            axios.get('/api/dashboard/kpi?' + params),
            axios.get('/api/dashboard/status-distribution?' + params),
            axios.get('/api/dashboard/team-distribution?' + params)
          ]);
          
          kpi.value = kpiRes.data;
          
          await nextTick();
          
          // 状态饼图
          const statusChartEl = document.getElementById('status-chart');
          if (statusChartEl) {
            const statusChart = echarts.init(statusChartEl);
            statusChart.setOption({
              tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
              legend: { orient: 'vertical', right: 10, top: 'center' },
              color: ['#165dff', '#14c9c9', '#f7ba1e', '#722ed1', '#0fc6c2'],
              series: [{ type: 'pie', radius: ['40%', '70%'], center: ['40%', '50%'], avoidLabelOverlap: false, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } }, data: statusRes.data.map(item => ({ name: item.status || '未知', value: item.count })) }]
            });
          }
          
          // 团队图
          const teamChartEl = document.getElementById('team-chart');
          if (teamChartEl) {
            const teamChart = echarts.init(teamChartEl);
            teamChart.setOption({
              tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
              legend: { data: ['剧本数', '平均分'], right: 10 },
              grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
              xAxis: { type: 'category', data: teamRes.data.map(item => item.team || '未知'), axisLabel: { interval: 0, rotate: 30 } },
              yAxis: [{ type: 'value', name: '数量' }, { type: 'value', name: '评分', min: 0, max: 100 }],
              series: [
                { name: '剧本数', type: 'bar', data: teamRes.data.map(item => item.count), itemStyle: { color: '#165dff', borderRadius: [4, 4, 0, 0] } },
                { name: '平均分', type: 'line', yAxisIndex: 1, data: teamRes.data.map(item => item.avg_score ? Number(item.avg_score).toFixed(1) : 0), itemStyle: { color: '#f5576c' }, lineStyle: { width: 2 }, symbol: 'circle', symbolSize: 6 }
              ]
            });
          }
        };
        
        const loadScripts = async () => {
          loading.value = true;
          const params = new URLSearchParams({ page: pagination.current, limit: pagination.pageSize });
          if (scriptTab.value === 'pending') params.set('tab', 'pending');
          if (scriptFilters.status) params.set('status', scriptFilters.status);
          if (scriptFilters.content_team) params.set('content_team', scriptFilters.content_team);
          if (scriptFilters.genre) params.set('genre', scriptFilters.genre);
          if (scriptFilters.keyword) params.set('keyword', scriptFilters.keyword);
          if (scriptDateRange.value?.[0]) params.set('start_date', dayjs(scriptDateRange.value[0]).format('YYYY-MM-DD'));
          if (scriptDateRange.value?.[1]) params.set('end_date', dayjs(scriptDateRange.value[1]).format('YYYY-MM-DD'));
          
          const res = await axios.get('/api/scripts?' + params);
          scripts.value = res.data.data;
          pagination.total = res.data.total;
          loading.value = false;
        };
        
        const loadRatings = async () => {
          loading.value = true;
          const params = new URLSearchParams({ page: ratingPagination.current, limit: ratingPagination.pageSize });
          if (ratingFilters.user_id) params.set('user_id', ratingFilters.user_id);
          if (ratingDateRange.value?.[0]) params.set('start_date', dayjs(ratingDateRange.value[0]).format('YYYY-MM-DD'));
          if (ratingDateRange.value?.[1]) params.set('end_date', dayjs(ratingDateRange.value[1]).format('YYYY-MM-DD'));
          
          const res = await axios.get('/api/ratings?' + params);
          ratings.value = res.data.data;
          ratingPagination.total = res.data.total;
          loading.value = false;
        };
        
        const loadRankings = async () => {
          const res = await axios.get('/api/rankings');
          rankings.value = res.data;
        };
        
        const loadOptions = async () => {
          const [optRes, userRes] = await Promise.all([axios.get('/api/options'), axios.get('/api/users')]);
          options.value = optRes.data;
          users.value = userRes.data;
        };
        
        const onPageChange = (page) => { pagination.current = page; loadScripts(); };
        const onRatingPageChange = (page) => { ratingPagination.current = page; loadRatings(); };
        
        const openFeishu = (script) => { 
          const url = script.feishu_url || 'https://bytedance.larkoffice.com';
          window.open(url, '_blank'); 
        };
        
        const openRatingDrawer = async (script) => {
          const res = await axios.get('/api/scripts/' + script.script_id);
          currentScript.value = res.data;
          ratingDrawerVisible.value = true;
        };
        
        const openRatingModal = () => {
          ratingForm.user_id = '';
          ratingForm.content_score = null;
          ratingForm.market_score = null;
          ratingForm.compliance_score = null;
          ratingForm.commercial_score = null;
          ratingForm.comments = '';
          ratingModalVisible.value = true;
        };
        
        const submitRating = async () => {
          if (!ratingForm.user_id) { ArcoVue.Message.warning('请选择评分人'); return; }
          if (!ratingForm.content_score && !ratingForm.market_score && !ratingForm.commercial_score) {
            ArcoVue.Message.warning('请至少填写一项评分'); return;
          }
          submitting.value = true;
          try {
            const user = users.value.find(u => u.user_id === ratingForm.user_id);
            await axios.post('/api/ratings', { ...ratingForm, script_id: currentScript.value.script_id, user_name: user?.name });
            ArcoVue.Message.success('评分提交成功');
            ratingModalVisible.value = false;
            const res = await axios.get('/api/scripts/' + currentScript.value.script_id);
            currentScript.value = res.data;
          } catch (e) {
            ArcoVue.Message.error('提交失败: ' + (e.response?.data?.error || e.message));
          }
          submitting.value = false;
        };
        
        const openEditModal = (script) => {
          Object.assign(editForm, {
            script_id: script.script_id,
            name: script.name || '',
            feishu_url: script.feishu_url || '',
            source_type: script.source_type || '',
            team: script.team || '',
            status: script.status || '',
            genre: script.genre || '',
            writer: script.writer || '',
            content_team: script.content_team || '',
            producer: script.producer || '',
            producer_team: script.producer_team || '',
            assign_status: script.assign_status || '待分配',
            is_project: !!script.is_project,
            project_name: script.project_name || '',
            remarks: script.remarks || ''
          });
          editModalVisible.value = true;
        };
        
        const submitEditScript = async () => {
          if (!editForm.name) { ArcoVue.Message.warning('剧本名称不能为空'); return; }
          submitting.value = true;
          try {
            await axios.put('/api/scripts/' + editForm.script_id, editForm);
            ArcoVue.Message.success('保存成功');
            editModalVisible.value = false;
            loadScripts();
          } catch (e) {
            ArcoVue.Message.error('保存失败: ' + (e.response?.data?.error || e.message));
          }
          submitting.value = false;
        };
        
        const deleteScript = async (id) => { 
          try {
            await axios.delete('/api/scripts/' + id); 
            ArcoVue.Message.success('删除成功'); 
            loadScripts(); 
          } catch (e) {
            ArcoVue.Message.error('删除失败: ' + (e.response?.data?.error || e.message));
          }
        };
        
        const goToScriptDetail = (script) => {
          currentPage.value = 'scripts';
          nextTick(() => {
            openRatingDrawer(script);
          });
        };
        
        watch(currentPage, async (page) => {
          if (page === 'dashboard') { await loadDashboard(); }
          else if (page === 'scripts') { await loadScripts(); }
          else if (page === 'ratings') { await loadRatings(); }
          else if (page === 'rankings') { await loadRankings(); }
        });
        
        onMounted(async () => {
          await loadOptions();
          await loadDashboard();
        });
        
        return {
          currentPage, loading, submitting, kpi, scripts, ratings, rankings, users, options,
          dateRange, scriptTab, scriptFilters, scriptDateRange, ratingFilters, ratingDateRange,
          pagination, ratingPagination, ratingDrawerVisible, ratingModalVisible, editModalVisible, currentScript, ratingForm, editForm,
          getScoreClass, getScoreColor, getStatusColor, loadDashboard, loadScripts, loadRatings,
          onPageChange, onRatingPageChange, openFeishu, openRatingDrawer, openRatingModal, submitRating, 
          openEditModal, submitEditScript, deleteScript, goToScriptDetail
        };
      }
    });
    
    app.use(ArcoVue);
    for (const [key, component] of Object.entries(ArcoVueIcon)) {
      app.component(key, component);
    }
    app.mount('#app');
  <\/script>
</body>
</html>`)
})

export default app
