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
  const { start_date, end_date, status } = c.req.query()
  
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
  if (status) {
    dateFilter += ' AND status = ?'
    params.push(status)
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
  const { start_date, end_date, status } = c.req.query()
  
  let sql = 'SELECT status, COUNT(*) as count FROM scripts WHERE 1=1'
  const params: any[] = []
  
  if (start_date) { sql += ' AND submit_date >= ?'; params.push(start_date) }
  if (end_date) { sql += ' AND submit_date <= ?'; params.push(end_date) }
  if (status) { sql += ' AND status = ?'; params.push(status) }
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
  const { start_date, end_date, status } = c.req.query()
  
  let sql = `SELECT content_team as team, COUNT(*) as count, AVG(avg_score) as avg_score 
             FROM scripts WHERE content_team IS NOT NULL AND content_team != ''`
  const params: any[] = []
  
  if (start_date) { sql += ' AND submit_date >= ?'; params.push(start_date) }
  if (end_date) { sql += ' AND submit_date <= ?'; params.push(end_date) }
  if (status) { sql += ' AND status = ?'; params.push(status) }
  sql += ' GROUP BY content_team ORDER BY count DESC'
  
  const result = await db.prepare(sql).bind(...params).all()
  return c.json(result.results || [])
})

// ==================== 剧本管理 API ====================

// 获取剧本列表（支持Tab切换和筛选）
app.get('/api/scripts', async (c) => {
  const db = c.env.DB
  const { 
    tab, status, statuses, source_type, team, genre, content_team, producer_team,
    is_project, min_score, max_score, keyword, start_date, end_date,
    assign_status, unrated, page = '1', limit = '10', sort = 'avg_score', order = 'desc'
  } = c.req.query()
  
  let sql = 'SELECT * FROM scripts WHERE 1=1'
  const params: any[] = []
  
  // Tab切换筛选
  if (tab === 'pending') {
    sql += ' AND assign_status = ?'
    params.push('待分配')
  }
  
  // 待评分筛选（没有评分记录的）
  if (unrated === 'true') {
    sql += ' AND (rating_count = 0 OR rating_count IS NULL)'
  }
  
  // 其他筛选条件
  if (assign_status) { sql += ' AND assign_status = ?'; params.push(assign_status) }
  
  // 单个状态筛选
  if (status) { sql += ' AND status = ?'; params.push(status) }
  
  // 多选状态筛选 (逗号分隔)
  if (statuses) {
    const statusArr = statuses.split(',').filter(s => s.trim())
    if (statusArr.length > 0) {
      sql += ` AND status IN (${statusArr.map(() => '?').join(',')})`
      params.push(...statusArr)
    }
  }
  
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
  
  // 获取待评分人员（主编/制片等指定评分人）
  const assignedRaters = await db.prepare(`
    SELECT * FROM users WHERE role_type IN ('主编', '制片', '项目负责人') ORDER BY role_type, name
  `).all()
  
  // 标记已评分和待评分状态
  const ratedUserIds = new Set((ratings.results || []).map((r: any) => r.user_id))
  const pendingRaters = (assignedRaters.results || []).map((u: any) => ({
    ...u,
    hasRated: ratedUserIds.has(u.user_id),
    status: ratedUserIds.has(u.user_id) ? '已评分' : '待评分'
  }))
  
  return c.json({ 
    ...script, 
    ratings: ratings.results || [],
    pendingRaters,
    ratedCount: ratings.results?.length || 0,
    pendingCount: pendingRaters.filter((r: any) => !r.hasRated).length
  })
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
  const { script_id, user_id, start_date, end_date, min_score, max_score, page = '1', limit = '10' } = c.req.query()
  
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

// ==================== 提醒 API ====================
app.post('/api/reminders', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  // 记录提醒（实际应用中可以发送飞书/企微消息）
  // 这里简单记录到日志
  console.log(`发送提醒: 剧本${body.script_id} -> 用户${body.user_id}`)
  
  return c.json({ 
    success: true, 
    message: '提醒已发送',
    reminded_at: new Date().toISOString()
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
    
    /* 简洁菜单样式 */
    .sidebar { width: 180px; background: #1d2129; position: fixed; height: 100vh; z-index: 100; }
    .sidebar-logo { padding: 20px 16px; color: #fff; font-size: 18px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .sidebar-menu { padding: 8px 0; }
    .menu-item { padding: 12px 16px; color: rgba(255,255,255,0.65); cursor: pointer; transition: all 0.2s; font-size: 14px; }
    .menu-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .menu-item.active { background: #165dff; color: #fff; }
    
    .main-content { margin-left: 180px; flex: 1; padding: 24px; min-height: 100vh; }
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 20px; font-weight: 600; color: #1d2129; }
    .stat-card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .stat-card-title { color: #86909c; font-size: 14px; margin-bottom: 8px; }
    .stat-card-value { font-size: 28px; font-weight: 600; color: #1d2129; }
    .chart-card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .chart-title { font-size: 16px; font-weight: 500; color: #1d2129; margin-bottom: 16px; }
    .filter-bar { background: #fff; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .tab-bar { margin-bottom: 16px; }
    .tab-bar .arco-radio-group-button { background: #fff; border-radius: 8px; padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .tab-bar .arco-radio-button { border-radius: 6px !important; padding: 6px 16px; }
    .table-card { background: #fff; border-radius: 8px; padding: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; }
    
    /* 剧本单元格样式 - 名称+编号上下排列 */
    .script-cell { display: flex; flex-direction: column; }
    .script-name { font-weight: 500; color: #1d2129; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .script-id { font-size: 12px; color: #86909c; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
    .script-id:hover { color: #165dff; }
    .copy-icon { opacity: 0; transition: opacity 0.2s; }
    .script-id:hover .copy-icon { opacity: 1; }
    
    /* 角色标签 */
    .role-tag { font-size: 11px; padding: 1px 6px; border-radius: 3px; display: inline-block; }
    .role-tag.主编 { background: #fff7e8; color: #ff7d00; }
    .role-tag.制片 { background: #e8f7ff; color: #0fc6c2; }
    .role-tag.评审 { background: #f0f0f0; color: #86909c; }
    .role-tag.内容 { background: #e8f3ff; color: #165dff; }
    .role-tag.项目负责人 { background: #f5f0ff; color: #722ed1; }
    
    /* 评分徽章 */
    .score-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 600; color: #fff; font-size: 13px; min-width: 45px; text-align: center; }
    .score-s { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .score-a { background: linear-gradient(135deg, #00b42a 0%, #23c343 100%); }
    .score-b { background: linear-gradient(135deg, #165dff 0%, #4080ff 100%); }
    .score-c { background: linear-gradient(135deg, #ff7d00 0%, #ff9a2e 100%); }
    .score-d { background: linear-gradient(135deg, #f53f3f 0%, #ff6b6b 100%); }
    
    /* 状态标签 */
    .status-tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .status-tag.待评分 { background: #fff7e8; color: #ff7d00; }
    .status-tag.已评分 { background: #e8ffea; color: #00b42a; }
    .status-tag.超时待评 { background: #ffece8; color: #f53f3f; }
    
    /* 表格优化 */
    .arco-table-stripe .arco-table-tr:nth-child(2n) .arco-table-td { background-color: #fafbfc; }
    .arco-table-tr:hover .arco-table-td { background-color: #f2f3f5 !important; }
    .arco-table-th { background-color: #f7f8fa !important; font-weight: 500 !important; }
    .table-card .arco-table { font-size: 13px; }
    
    /* 弹框标签页样式 - 放大版 */
    .modal-tabs { margin-bottom: 0; }
    .modal-tabs .arco-tabs-nav { padding: 0 4px; }
    .modal-tabs .arco-tabs-tab { padding: 12px 20px; font-size: 14px; }
    .tab-content { max-height: 560px; overflow-y: auto; padding: 20px 12px 20px 0; }
    .tab-content::-webkit-scrollbar { width: 6px; }
    .tab-content::-webkit-scrollbar-thumb { background: #e5e6eb; border-radius: 3px; }
    .tab-content::-webkit-scrollbar-track { background: transparent; }
    
    /* 信息卡片 - 两列布局 */
    .info-card { background: #f7f8fa; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 40px; }
    .info-row { display: flex; align-items: center; }
    .info-label { color: #86909c; width: 80px; flex-shrink: 0; font-size: 13px; }
    .info-value { color: #1d2129; flex: 1; font-size: 13px; font-weight: 500; }
    .info-value .arco-tag { font-weight: 400; }
    
    /* 综合评分卡片 */
    .score-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px; text-align: center; color: #fff; margin-bottom: 20px; }
    .score-card .score-value { font-size: 48px; font-weight: 700; line-height: 1.2; }
    .score-card .score-label { font-size: 14px; opacity: 0.9; margin-top: 4px; }
    
    /* 分项评分 */
    .dimension-scores { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
    .dimension-item { background: #fff; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .dimension-label { font-size: 12px; color: #86909c; margin-bottom: 8px; }
    .dimension-value { font-size: 24px; font-weight: 600; color: #1d2129; }
    
    /* 评分记录列表 */
    .rating-list { }
    .rating-item { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .rating-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .rating-user { display: flex; align-items: center; gap: 8px; }
    .rating-user-name { font-weight: 500; color: #1d2129; }
    .rating-time { font-size: 12px; color: #86909c; }
    .rating-scores { display: flex; gap: 16px; margin-bottom: 12px; }
    .rating-score-item { text-align: center; }
    .rating-score-label { font-size: 11px; color: #86909c; margin-bottom: 4px; }
    .rating-score-value { font-size: 18px; font-weight: 600; }
    .rating-comment { background: #f7f8fa; padding: 12px; border-radius: 6px; font-size: 13px; color: #4e5969; line-height: 1.6; }
    .rating-comment-toggle { color: #165dff; cursor: pointer; font-size: 12px; margin-top: 8px; }
    
    /* 待评分管理 */
    .pending-list { }
    .pending-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; margin-bottom: 10px; }
    .pending-user { display: flex; align-items: center; gap: 10px; }
    .pending-user-name { font-weight: 500; }
    .pending-status { display: flex; align-items: center; gap: 12px; }
    .timeout-badge { color: #f53f3f; font-size: 12px; font-weight: 500; }
    .reminded-info { font-size: 11px; color: #86909c; }
    
    /* 空状态 */
    .empty-state { text-align: center; padding: 60px 20px; color: #86909c; }
  </style>
</head>
<body>
  <div id="app">
    <div class="layout">
      <!-- 简洁菜单 -->
      <aside class="sidebar">
        <div class="sidebar-logo">DeepDrama</div>
        <nav class="sidebar-menu">
          <div class="menu-item" :class="{ active: currentPage === 'dashboard' }" @click="currentPage = 'dashboard'">剧本概览</div>
          <div class="menu-item" :class="{ active: currentPage === 'scripts' }" @click="currentPage = 'scripts'">剧本管理</div>
          <div class="menu-item" :class="{ active: currentPage === 'ratings' }" @click="currentPage = 'ratings'">评分记录</div>
          <div class="menu-item" :class="{ active: currentPage === 'rankings' }" @click="currentPage = 'rankings'">剧本排行</div>
        </nav>
      </aside>
      
      <main class="main-content">
        <!-- 剧本概览 -->
        <div v-if="currentPage === 'dashboard'">
          <div class="page-header"><h1 class="page-title">剧本概览</h1></div>
          
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
          <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h1 class="page-title">剧本管理</h1>
            <a-button type="primary" @click="openCreateModal">新建剧本</a-button>
          </div>
          
          <!-- Tab切换: 评分状态 -->
          <div class="tab-bar">
            <a-radio-group v-model="scriptFilters.tab" type="button" @change="onTabChange">
              <a-radio value="all">全部</a-radio>
              <a-radio value="pending_rating">待评分</a-radio>
              <a-radio value="pending_claim">待认领</a-radio>
              <a-radio value="project">已立项</a-radio>
              <a-radio value="abandoned">已废弃</a-radio>
            </a-radio-group>
          </div>
          
          <!-- 搜索和筛选区域 -->
          <div class="filter-bar">
            <a-row :gutter="16" align="center">
              <!-- 快捷搜索 -->
              <a-col :flex="'300px'">
                <a-input-search v-model="scriptFilters.keyword" placeholder="搜索剧本名称或编号" allow-clear @search="onSearchScript" @press-enter="onSearchScript">
                  <template #prefix><icon-search /></template>
                </a-input-search>
              </a-col>
              
              <!-- 筛选项 -->
              <a-col :flex="'auto'">
                <a-space wrap>
                  <a-select v-model="scriptFilters.statuses" placeholder="剧本状态" allow-clear multiple :max-tag-count="1" style="min-width: 150px;" @change="loadScripts">
                    <a-option value="一卡初稿">一卡初稿</a-option>
                    <a-option value="改稿中">改稿中</a-option>
                    <a-option value="完整剧本">完整剧本</a-option>
                    <a-option value="终稿">终稿</a-option>
                    <a-option value="已废弃">已废弃</a-option>
                  </a-select>
                  <a-select v-model="scriptFilters.source_type" placeholder="投稿类型" allow-clear style="width: 130px;" @change="loadScripts">
                    <a-option value="外部投稿">外部投稿</a-option>
                    <a-option value="内部团队">内部团队</a-option>
                    <a-option value="合作剧组">合作剧组</a-option>
                    <a-option value="版权购买">版权购买</a-option>
                  </a-select>
                  <a-select v-model="scriptFilters.genre" placeholder="剧本分类" allow-clear style="width: 110px;" @change="loadScripts">
                    <a-option value="男频">男频</a-option>
                    <a-option value="女频">女频</a-option>
                    <a-option value="皆可">皆可</a-option>
                  </a-select>
                  <a-button @click="resetScriptFilters">重置筛选</a-button>
                </a-space>
              </a-col>
            </a-row>
          </div>
          
          <div class="table-card">
            <a-table :data="scripts" :pagination="scriptPagination" :loading="loading" @page-change="onPageChange" @page-size-change="onPageSizeChange" row-key="script_id" :bordered="{ cell: true }" :stripe="true" :scroll="{x: 1600}">
              <template #columns>
                <!-- 剧本信息：名称+编号合并 -->
                <a-table-column title="剧本" :width="220" fixed="left">
                  <template #cell="{ record }">
                    <div class="script-cell">
                      <a-tooltip :content="record.name">
                        <div class="script-name">{{ record.name }}</div>
                      </a-tooltip>
                      <div class="script-id" @click="copyToClipboard(record.script_id)">
                        {{ record.script_id }}
                        <icon-copy class="copy-icon" :size="12" />
                      </div>
                    </div>
                  </template>
                </a-table-column>
                
                <a-table-column title="综合评分" :width="100" align="center">
                  <template #cell="{ record }">
                    <span :class="'score-badge score-' + getScoreClass(record.avg_score)">{{ record.avg_score?.toFixed(1) || '-' }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="评分人数" data-index="rating_count" :width="90" align="center">
                  <template #cell="{ record }">{{ record.rating_count || 0 }}</template>
                </a-table-column>
                <a-table-column title="剧本状态" :width="100" align="center">
                  <template #cell="{ record }">
                    <a-tag size="small" :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
                  </template>
                </a-table-column>
                <a-table-column title="立项" :width="80" align="center">
                  <template #cell="{ record }">
                    <a-tag v-if="record.is_project" size="small" color="green">已立项</a-tag>
                    <span v-else style="color: #c9cdd4;">-</span>
                  </template>
                </a-table-column>
                <a-table-column title="编剧" data-index="writer" :width="90">
                  <template #cell="{ record }">{{ record.writer || '-' }}</template>
                </a-table-column>
                <a-table-column title="内容团队" data-index="content_team" :width="100">
                  <template #cell="{ record }">{{ record.content_team || '-' }}</template>
                </a-table-column>
                <a-table-column title="制片" data-index="producer" :width="90">
                  <template #cell="{ record }">{{ record.producer || '-' }}</template>
                </a-table-column>
                <a-table-column title="类型" data-index="genre" :width="80" align="center">
                  <template #cell="{ record }">{{ record.genre || '-' }}</template>
                </a-table-column>
                <a-table-column title="提交日期" data-index="submit_date" :width="110" align="center" />
                
                <a-table-column title="操作" :width="160" align="center" fixed="right">
                  <template #cell="{ record }">
                    <a-space>
                      <a-button type="text" size="small" @click="openFeishu(record)">看剧本</a-button>
                      <a-button type="primary" size="mini" @click="openRatingModal(record)">去评分</a-button>
                      <a-dropdown>
                        <a-button type="text" size="small">更多</a-button>
                        <template #content>
                          <a-doption @click="openEditModal(record)">编辑</a-doption>
                          <a-doption style="color: #f53f3f;" @click="confirmDeleteScript(record.script_id)">删除</a-doption>
                        </template>
                      </a-dropdown>
                    </a-space>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </div>
        </div>
        
        <!-- 评分记录 -->
        <div v-if="currentPage === 'ratings'">
          <div class="page-header"><h1 class="page-title">评分记录</h1></div>
          
          <div class="filter-bar">
            <a-space wrap>
              <a-select v-model="ratingFilters.user_id" placeholder="评分人" allow-clear style="width: 150px;" @change="loadRatings">
                <a-option v-for="u in users" :key="u.user_id" :value="u.user_id">{{ u.name }}</a-option>
              </a-select>
              <a-range-picker v-model="ratingDateRange" @change="loadRatings" allow-clear style="width: 260px;" />
            </a-space>
          </div>
          
          <div class="table-card">
            <a-table :data="ratings" :pagination="ratingPagination" :loading="loading" @page-change="onRatingPageChange" @page-size-change="onRatingPageSizeChange" row-key="id" :bordered="{ cell: true }" :stripe="true" :scroll="{x: 1200}">
              <template #columns>
                <!-- 剧本信息：名称+编号合并 -->
                <a-table-column title="剧本" :width="200" fixed="left">
                  <template #cell="{ record }">
                    <div class="script-cell">
                      <div class="script-name">{{ record.script_name || '-' }}</div>
                      <div class="script-id" @click="copyToClipboard(record.script_id)">
                        {{ record.script_id }}
                        <icon-copy class="copy-icon" :size="12" />
                      </div>
                    </div>
                  </template>
                </a-table-column>
                
                <a-table-column title="评分人" :width="120">
                  <template #cell="{ record }">
                    <span>{{ record.user_name }}</span>
                    <span :class="'role-tag ' + (record.role_type || record.user_role)" style="margin-left: 6px;">{{ record.role_type || record.user_role }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="内容" :width="80" align="center">
                  <template #cell="{ record }">
                    <span :style="{ color: getScoreColor(record.content_score), fontWeight: 500 }">{{ record.content_score || '-' }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="题材" :width="80" align="center">
                  <template #cell="{ record }">
                    <span :style="{ color: getScoreColor(record.market_score), fontWeight: 500 }">{{ record.market_score || '-' }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="制作" :width="80" align="center">
                  <template #cell="{ record }">
                    <span :style="{ color: getScoreColor(record.commercial_score), fontWeight: 500 }">{{ record.commercial_score || '-' }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="综合" :width="90" align="center">
                  <template #cell="{ record }">
                    <span :class="'score-badge score-' + getScoreClass(record.total_score)">{{ record.total_score?.toFixed(1) || '-' }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="评分日期" data-index="rating_date" :width="110" align="center" />
                <a-table-column title="评语" :width="200">
                  <template #cell="{ record }">
                    <a-tooltip v-if="record.comments" :content="record.comments">
                      <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #4e5969;">{{ record.comments }}</div>
                    </a-tooltip>
                    <span v-else style="color: #c9cdd4;">-</span>
                  </template>
                </a-table-column>
              </template>
            </a-table>
          </div>
        </div>
        
        <!-- 剧本排行 -->
        <div v-if="currentPage === 'rankings'">
          <div class="page-header"><h1 class="page-title">剧本排行</h1></div>
          
          <div class="table-card">
            <a-table :data="rankings" :pagination="false" row-key="script_id" :bordered="false" :scroll="{x: 900}">
              <template #columns>
                <a-table-column title="排名" :width="70" align="center">
                  <template #cell="{ record }">
                    <span v-if="record.medal" style="font-size: 24px;">{{ record.medal }}</span>
                    <span v-else style="font-size: 16px; color: #86909c;">#{{ record.rank }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="剧本" :width="240">
                  <template #cell="{ record }">
                    <div class="script-cell">
                      <div class="script-name">{{ record.name }}</div>
                      <div class="script-id" @click="copyToClipboard(record.script_id)">
                        {{ record.script_id }} · {{ record.content_team || '-' }}
                        <icon-copy class="copy-icon" :size="12" />
                      </div>
                    </div>
                  </template>
                </a-table-column>
                <a-table-column title="综合评分" :width="100" align="center">
                  <template #cell="{ record }">
                    <span :class="'score-badge score-' + getScoreClass(record.avg_score)">{{ record.avg_score?.toFixed(1) }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="评分人数" data-index="rater_count" :width="90" align="center" />
                <a-table-column title="内容均分" :width="90" align="center">
                  <template #cell="{ record }">{{ record.avg_content_score?.toFixed(1) || '-' }}</template>
                </a-table-column>
                <a-table-column title="题材均分" :width="90" align="center">
                  <template #cell="{ record }">{{ record.avg_market_score?.toFixed(1) || '-' }}</template>
                </a-table-column>
                <a-table-column title="制作均分" :width="90" align="center">
                  <template #cell="{ record }">{{ record.avg_commercial_score?.toFixed(1) || '-' }}</template>
                </a-table-column>
              </template>
            </a-table>
          </div>
        </div>
      </main>
    </div>
    
    <!-- 评分弹框 - 4个标签页 (宽度放大2倍) -->
    <a-modal v-model:visible="ratingModalVisible" :title="currentScript?.name || '评分详情'" :width="1200" :footer="false" unmount-on-close top="60px" :body-style="{padding: '16px 20px'}">
      <a-tabs v-model:active-key="ratingTabKey" class="modal-tabs">
        <!-- 标签页1: 基础信息 -->
        <a-tab-pane key="info" title="基础信息">
          <div class="tab-content" v-if="currentScript">
            <div class="info-card">
              <div class="info-grid">
                <div class="info-row">
                  <span class="info-label">剧本编号</span>
                  <span class="info-value">{{ currentScript.script_id }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">剧本状态</span>
                  <span class="info-value"><a-tag size="small" :color="getStatusColor(currentScript.status)">{{ currentScript.status }}</a-tag></span>
                </div>
                <div class="info-row">
                  <span class="info-label">编剧</span>
                  <span class="info-value">{{ currentScript.writer || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">立项状态</span>
                  <span class="info-value">
                    <a-tag v-if="currentScript.is_project" size="small" color="green">已立项</a-tag>
                    <span v-else style="color: #86909c; font-weight: 400;">未立项</span>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">内容团队</span>
                  <span class="info-value">{{ currentScript.content_team || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">制片团队</span>
                  <span class="info-value">{{ currentScript.producer_team || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">制片</span>
                  <span class="info-value">{{ currentScript.producer || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">类型</span>
                  <span class="info-value">{{ currentScript.genre || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">提交日期</span>
                  <span class="info-value">{{ currentScript.submit_date || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">来源</span>
                  <span class="info-value">{{ currentScript.source_type || '-' }}</span>
                </div>
              </div>
            </div>
            
            <h4 style="margin: 20px 0 12px; font-size: 14px; color: #1d2129; font-weight: 600;">项目关联人员</h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              <div v-for="u in currentScript.pendingRaters" :key="u.user_id" 
                   style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #f7f8fa; border-radius: 8px; border: 1px solid #e5e6eb;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 500;">{{ u.name }}</span>
                  <span :class="'role-tag ' + u.role_type">{{ u.role_type }}</span>
                </div>
                <span v-if="u.hasRated" style="color: #00b42a; font-size: 12px;">✓ 已评</span>
                <span v-else style="color: #ff7d00; font-size: 12px;">待评分</span>
              </div>
            </div>
            
            <div v-if="currentScript.feishu_url" style="margin-top: 20px;">
              <a-button type="outline" @click="openFeishu(currentScript)" long>
                <icon-link style="margin-right: 6px;" /> 查看飞书文档
              </a-button>
            </div>
          </div>
        </a-tab-pane>
        
        <!-- 标签页2: 综合评分 -->
        <a-tab-pane key="score" title="综合评分">
          <div class="tab-content" v-if="currentScript">
            <a-row :gutter="20">
              <a-col :span="10">
                <div class="score-card">
                  <div class="score-value">{{ currentScript.avg_score?.toFixed(1) || '-' }}</div>
                  <div class="score-label">综合评分 · {{ currentScript.ratedCount || 0 }}人已评</div>
                </div>
                
                <div class="dimension-scores" style="grid-template-columns: 1fr; gap: 10px; margin-top: 16px;">
                  <div class="dimension-item" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px;">
                    <div class="dimension-label" style="margin: 0;">内容评分</div>
                    <div class="dimension-value" style="color: #165dff; font-size: 20px;">{{ avgDimensionScores.content?.toFixed(1) || '-' }}</div>
                  </div>
                  <div class="dimension-item" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px;">
                    <div class="dimension-label" style="margin: 0;">题材评分</div>
                    <div class="dimension-value" style="color: #00b42a; font-size: 20px;">{{ avgDimensionScores.market?.toFixed(1) || '-' }}</div>
                  </div>
                  <div class="dimension-item" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px;">
                    <div class="dimension-label" style="margin: 0;">制作评分</div>
                    <div class="dimension-value" style="color: #722ed1; font-size: 20px;">{{ avgDimensionScores.commercial?.toFixed(1) || '-' }}</div>
                  </div>
                </div>
              </a-col>
              <a-col :span="14">
                <div style="background: #fff; border-radius: 8px; padding: 16px; border: 1px solid #e5e6eb;">
                  <div style="font-size: 14px; font-weight: 500; color: #1d2129; margin-bottom: 12px;">评分分布</div>
                  <div id="score-chart" style="height: 280px;"></div>
                </div>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
        
        <!-- 标签页3: 已评分记录 -->
        <a-tab-pane key="rated" :title="'已评分记录 (' + (currentScript?.ratedCount || 0) + ')'">
          <div class="tab-content">
            <div v-if="!currentScript?.ratings?.length" class="empty-state">
              <icon-inbox style="font-size: 48px; color: #c9cdd4; margin-bottom: 12px;" />
              <div>暂无评分记录</div>
            </div>
            <div v-else>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div v-for="r in currentScript.ratings" :key="r.id" class="rating-item" style="margin-bottom: 0;">
                  <div class="rating-header">
                    <div class="rating-user">
                      <span class="rating-user-name">{{ r.user_name }}</span>
                      <span :class="'role-tag ' + (r.role_type || r.user_role)">{{ r.role_type || r.user_role }}</span>
                    </div>
                    <span class="rating-time">{{ r.rating_date }}</span>
                  </div>
                  <div class="rating-scores" style="gap: 20px; margin-bottom: 8px;">
                    <div class="rating-score-item">
                      <div class="rating-score-label">内容</div>
                      <div class="rating-score-value" :style="{ color: getScoreColor(r.content_score) }">{{ r.content_score || '-' }}</div>
                    </div>
                    <div class="rating-score-item">
                      <div class="rating-score-label">题材</div>
                      <div class="rating-score-value" :style="{ color: getScoreColor(r.market_score) }">{{ r.market_score || '-' }}</div>
                    </div>
                    <div class="rating-score-item">
                      <div class="rating-score-label">制作</div>
                      <div class="rating-score-value" :style="{ color: getScoreColor(r.commercial_score) }">{{ r.commercial_score || '-' }}</div>
                    </div>
                    <div class="rating-score-item" style="border-left: 2px solid #e5e6eb; padding-left: 20px;">
                      <div class="rating-score-label">综合</div>
                      <div class="rating-score-value" style="color: #165dff; font-weight: 700;">{{ r.total_score?.toFixed(1) || '-' }}</div>
                    </div>
                  </div>
                  <div v-if="r.comments" class="rating-comment">
                    <div v-if="expandedComments[r.id] || r.comments?.length <= 80">{{ r.comments }}</div>
                    <div v-else>{{ r.comments?.slice(0, 80) }}...</div>
                    <div v-if="r.comments?.length > 80" class="rating-comment-toggle" @click="toggleComment(r.id)">
                      {{ expandedComments[r.id] ? '收起' : '查看完整意见' }}
                    </div>
                  </div>
                  <div v-else style="color: #c9cdd4; font-size: 12px;">暂无评语</div>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>
        
        <!-- 标签页4: 待评分管理 -->
        <a-tab-pane key="pending" :title="'待评分管理 (' + (currentScript?.pendingCount || 0) + ')'">
          <div class="tab-content">
            <a-row :gutter="20">
              <!-- 待评分列表 -->
              <a-col :span="14">
                <div style="background: #fff; border-radius: 8px; padding: 16px; border: 1px solid #e5e6eb;">
                  <div style="font-size: 14px; font-weight: 500; color: #1d2129; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <span>待评分人员</span>
                    <a-button type="text" size="small" @click="sendReminderToAll" :disabled="!hasPendingRaters">
                      <icon-send style="margin-right: 4px;" /> 一键提醒全部
                    </a-button>
                  </div>
                  <div class="pending-list">
                    <div v-for="u in currentScript?.pendingRaters?.filter(r => !r.hasRated)" :key="u.user_id" class="pending-item">
                      <div class="pending-user">
                        <span class="pending-user-name">{{ u.name }}</span>
                        <span :class="'role-tag ' + u.role_type">{{ u.role_type }}</span>
                      </div>
                      <div class="pending-status">
                        <span v-if="getOverdueDays(u) > 0" class="timeout-badge">
                          <icon-clock-circle style="margin-right: 2px;" /> 超时{{ getOverdueDays(u) }}天
                        </span>
                        <span class="status-tag 待评分">待评分</span>
                        <template v-if="remindedUsers[u.user_id]">
                          <span class="reminded-info">已提醒 {{ remindedUsers[u.user_id] }}</span>
                        </template>
                        <a-button v-else type="primary" size="mini" @click="sendReminder(u)">发送提醒</a-button>
                      </div>
                    </div>
                    <div v-if="!currentScript?.pendingRaters?.filter(r => !r.hasRated).length" class="empty-state" style="padding: 30px;">
                      <icon-check-circle style="font-size: 36px; color: #00b42a; margin-bottom: 8px;" />
                      <div>所有人员已完成评分</div>
                    </div>
                  </div>
                </div>
                
                <!-- 已评分人员 -->
                <div style="background: #fff; border-radius: 8px; padding: 16px; border: 1px solid #e5e6eb; margin-top: 16px;">
                  <div style="font-size: 14px; font-weight: 500; color: #1d2129; margin-bottom: 16px;">已评分人员</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    <div v-for="u in currentScript?.pendingRaters?.filter(r => r.hasRated)" :key="u.user_id" 
                         style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #e8ffea; border-radius: 6px; border: 1px solid #b3f0b3;">
                      <icon-check-circle style="color: #00b42a;" />
                      <span>{{ u.name }}</span>
                      <span :class="'role-tag ' + u.role_type">{{ u.role_type }}</span>
                    </div>
                    <div v-if="!currentScript?.pendingRaters?.filter(r => r.hasRated).length" style="color: #86909c; font-size: 13px;">
                      暂无已评分人员
                    </div>
                  </div>
                </div>
              </a-col>
              
              <!-- 提交评分区域 -->
              <a-col :span="10">
                <div style="background: linear-gradient(135deg, #f0f5ff 0%, #e8f3ff 100%); border-radius: 8px; padding: 20px; border: 1px solid #bedaff;">
                  <div style="font-size: 16px; font-weight: 600; color: #1d2129; margin-bottom: 16px;">提交我的评分</div>
                  <a-form :model="ratingForm" layout="vertical" size="small">
                    <a-form-item label="评分人" required>
                      <a-select v-model="ratingForm.user_id" placeholder="请选择评分人">
                        <a-option v-for="u in users" :key="u.user_id" :value="u.user_id">{{ u.name }} ({{ u.role_type }})</a-option>
                      </a-select>
                    </a-form-item>
                    <a-row :gutter="12">
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
                      <a-textarea v-model="ratingForm.comments" placeholder="请输入评分意见（可选）" :auto-size="{ minRows: 3, maxRows: 5 }" />
                    </a-form-item>
                    <a-button type="primary" long @click="submitRatingDirect" :loading="submitting">提交评分</a-button>
                  </a-form>
                </div>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-modal>
    
    <!-- 提交评分弹框 -->
    <a-modal v-model:visible="submitRatingVisible" title="提交评分" @ok="submitRating" :ok-loading="submitting" ok-text="提交" :width="500">
      <a-form :model="ratingForm" layout="vertical">
        <a-form-item label="评分人" required>
          <a-select v-model="ratingForm.user_id" placeholder="请选择">
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
          <a-textarea v-model="ratingForm.comments" placeholder="请输入评分意见" :auto-size="{ minRows: 3 }" />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <!-- 编辑/新建剧本弹框 -->
    <a-modal v-model:visible="editModalVisible" :title="editForm.script_id ? '编辑剧本' : '新建剧本'" @ok="submitScript" :ok-loading="submitting" :width="600">
      <a-form :model="editForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="剧本名称" required>
              <a-input v-model="editForm.name" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="飞书文档">
              <a-input v-model="editForm.feishu_url" placeholder="请输入URL" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="剧本状态">
              <a-select v-model="editForm.status">
                <a-option value="一卡初稿">一卡初稿</a-option>
                <a-option value="改稿中">改稿中</a-option>
                <a-option value="完整剧本">完整剧本</a-option>
                <a-option value="终稿">终稿</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="内容类型">
              <a-select v-model="editForm.genre">
                <a-option value="男频">男频</a-option>
                <a-option value="女频">女频</a-option>
                <a-option value="皆可">皆可</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="投稿类型">
              <a-select v-model="editForm.source_type">
                <a-option value="外部投稿">外部投稿</a-option>
                <a-option value="内部团队">内部团队</a-option>
                <a-option value="合作剧组">合作剧组</a-option>
                <a-option value="版权购买">版权购买</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="编剧">
              <a-select v-model="editForm.writer" allow-clear>
                <a-option v-for="w in options.writers" :key="w" :value="w">{{ w }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="内容团队">
              <a-select v-model="editForm.content_team" allow-clear>
                <a-option v-for="t in options.contentTeams" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="制片">
              <a-select v-model="editForm.producer" allow-clear>
                <a-option v-for="p in options.producers" :key="p" :value="p">{{ p }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="立项">
              <a-switch v-model="editForm.is_project" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
  
  <script>
    const { createApp, ref, reactive, computed, onMounted, watch, nextTick } = Vue;
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
        const options = ref({ contentTeams: [], writers: [], producers: [] });
        
        // 筛选
        const scriptFilters = reactive({ 
          tab: 'all',           // Tab切换: all/pending_rating/pending_claim/project/abandoned
          keyword: '',          // 快捷搜索
          statuses: [],         // 剧本状态(多选)
          source_type: '',      // 投稿类型
          genre: '',            // 剧本分类
          content_team: ''      // 内容团队
        });
        const ratingFilters = reactive({ user_id: '' });
        const ratingDateRange = ref([]);
        
        // 分页 - 默认10条/页，支持切换和跳转
        const scriptPagination = reactive({ 
          current: 1, 
          pageSize: 10, 
          total: 0, 
          showTotal: true,
          showPageSize: true,
          pageSizeOptions: [10, 20, 50, 100],
          showJumper: true
        });
        const ratingPagination = reactive({ 
          current: 1, 
          pageSize: 10, 
          total: 0, 
          showTotal: true,
          showPageSize: true,
          pageSizeOptions: [10, 20, 50, 100],
          showJumper: true
        });
        
        // 弹框
        const ratingModalVisible = ref(false);
        const ratingTabKey = ref('info');
        const submitRatingVisible = ref(false);
        const editModalVisible = ref(false);
        const currentScript = ref(null);
        const expandedComments = reactive({});
        const remindedUsers = reactive({});
        
        const ratingForm = reactive({ user_id: '', content_score: null, market_score: null, commercial_score: null, comments: '' });
        const editForm = reactive({ script_id: '', name: '', feishu_url: '', status: '一卡初稿', genre: '皆可', source_type: '内部团队', writer: '', content_team: '', producer: '', is_project: false });
        
        // 计算分项均分
        const avgDimensionScores = computed(() => {
          if (!currentScript.value?.ratings?.length) return { content: null, market: null, commercial: null };
          const r = currentScript.value.ratings;
          return {
            content: r.filter(x => x.content_score).reduce((a, b) => a + b.content_score, 0) / r.filter(x => x.content_score).length || null,
            market: r.filter(x => x.market_score).reduce((a, b) => a + b.market_score, 0) / r.filter(x => x.market_score).length || null,
            commercial: r.filter(x => x.commercial_score).reduce((a, b) => a + b.commercial_score, 0) / r.filter(x => x.commercial_score).length || null
          };
        });
        
        // 工具函数
        const getScoreClass = (score) => { if (!score) return 'd'; if (score >= 80) return 'a'; if (score >= 70) return 'b'; if (score >= 60) return 'c'; return 'd'; };
        const getScoreColor = (score) => { if (!score) return '#86909c'; if (score >= 80) return '#00b42a'; if (score >= 70) return '#165dff'; if (score >= 60) return '#ff7d00'; return '#f53f3f'; };
        const getStatusColor = (status) => ({ '一卡初稿': 'blue', '改稿中': 'orange', '完整剧本': 'green', '终稿': 'purple' }[status] || 'gray');
        const getOverdueDays = (user) => {
          // 模拟超时天数 - 实际应根据分配日期计算
          const seed = user.user_id?.charCodeAt?.(0) || 0;
          return seed % 3 === 0 ? Math.floor(seed % 5) + 1 : 0;
        };
        
        const hasPendingRaters = computed(() => {
          return currentScript.value?.pendingRaters?.some(r => !r.hasRated) || false;
        });
        
        const copyToClipboard = (text) => {
          navigator.clipboard.writeText(text).then(() => ArcoVue.Message.success('已复制: ' + text));
        };
        
        const toggleComment = (id) => { expandedComments[id] = !expandedComments[id]; };
        
        // API
        const loadDashboard = async () => {
          const [kpiRes, statusRes, teamRes] = await Promise.all([
            axios.get('/api/dashboard/kpi'),
            axios.get('/api/dashboard/status-distribution'),
            axios.get('/api/dashboard/team-distribution')
          ]);
          kpi.value = kpiRes.data;
          await nextTick();
          
          const statusChartEl = document.getElementById('status-chart');
          if (statusChartEl) {
            echarts.init(statusChartEl).setOption({
              tooltip: { trigger: 'item' },
              legend: { orient: 'vertical', right: 10, top: 'center' },
              series: [{ type: 'pie', radius: ['40%', '70%'], center: ['40%', '50%'], data: statusRes.data.map(i => ({ name: i.status || '未知', value: i.count })) }]
            });
          }
          
          const teamChartEl = document.getElementById('team-chart');
          if (teamChartEl) {
            echarts.init(teamChartEl).setOption({
              tooltip: { trigger: 'axis' },
              xAxis: { type: 'category', data: teamRes.data.map(i => i.team || '未知'), axisLabel: { rotate: 30 } },
              yAxis: [{ type: 'value', name: '数量' }, { type: 'value', name: '评分', max: 100 }],
              series: [
                { name: '剧本数', type: 'bar', data: teamRes.data.map(i => i.count) },
                { name: '均分', type: 'line', yAxisIndex: 1, data: teamRes.data.map(i => i.avg_score?.toFixed(1) || 0) }
              ]
            });
          }
        };
        
        const loadScripts = async () => {
          loading.value = true;
          const params = new URLSearchParams({ page: scriptPagination.current, limit: scriptPagination.pageSize });
          
          // Tab筛选
          if (scriptFilters.tab === 'pending_rating') params.set('unrated', 'true');
          else if (scriptFilters.tab === 'pending_claim') params.set('assign_status', '待分配');
          else if (scriptFilters.tab === 'project') params.set('is_project', 'true');
          else if (scriptFilters.tab === 'abandoned') params.set('status', '已废弃');
          
          // 关键词搜索
          if (scriptFilters.keyword) params.set('keyword', scriptFilters.keyword);
          
          // 剧本状态(多选) - 传逗号分隔
          if (scriptFilters.statuses?.length && scriptFilters.tab !== 'abandoned') {
            params.set('statuses', scriptFilters.statuses.join(','));
          }
          
          // 投稿类型
          if (scriptFilters.source_type) params.set('source_type', scriptFilters.source_type);
          
          // 剧本分类
          if (scriptFilters.genre) params.set('genre', scriptFilters.genre);
          
          // 内容团队
          if (scriptFilters.content_team) params.set('content_team', scriptFilters.content_team);
          
          const res = await axios.get('/api/scripts?' + params);
          scripts.value = res.data.data;
          scriptPagination.total = res.data.total;
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
        
        const resetScriptFilters = () => { 
          Object.assign(scriptFilters, { tab: scriptFilters.tab, keyword: '', statuses: [], source_type: '', genre: '', content_team: '' }); 
          scriptPagination.current = 1;
          loadScripts(); 
        };
        
        const onTabChange = () => {
          scriptPagination.current = 1;
          loadScripts();
        };
        
        const onSearchScript = () => {
          scriptPagination.current = 1;
          loadScripts();
        };
        
        const onPageChange = (p) => { scriptPagination.current = p; loadScripts(); };
        const onPageSizeChange = (size) => { scriptPagination.pageSize = size; scriptPagination.current = 1; loadScripts(); };
        const onRatingPageChange = (p) => { ratingPagination.current = p; loadRatings(); };
        const onRatingPageSizeChange = (size) => { ratingPagination.pageSize = size; ratingPagination.current = 1; loadRatings(); };
        
        const openFeishu = (s) => window.open(s.feishu_url || 'https://bytedance.larkoffice.com', '_blank');
        
        const openRatingModal = async (script) => {
          const res = await axios.get('/api/scripts/' + script.script_id);
          currentScript.value = res.data;
          ratingTabKey.value = 'info';
          ratingModalVisible.value = true;
          
          await nextTick();
          // 渲染分项评分图表
          const chartEl = document.getElementById('score-chart');
          if (chartEl && currentScript.value?.ratings?.length) {
            const dims = avgDimensionScores.value;
            echarts.init(chartEl).setOption({
              radar: { indicator: [{ name: '内容', max: 100 }, { name: '题材', max: 100 }, { name: '制作', max: 100 }] },
              series: [{ type: 'radar', data: [{ value: [dims.content || 0, dims.market || 0, dims.commercial || 0], name: '评分' }] }]
            });
          }
        };
        
        const openSubmitRating = () => {
          Object.assign(ratingForm, { user_id: '', content_score: null, market_score: null, commercial_score: null, comments: '' });
          submitRatingVisible.value = true;
        };
        
        const submitRating = async () => {
          if (!ratingForm.user_id) { ArcoVue.Message.warning('请选择评分人'); return; }
          submitting.value = true;
          try {
            const user = users.value.find(u => u.user_id === ratingForm.user_id);
            await axios.post('/api/ratings', { ...ratingForm, script_id: currentScript.value.script_id, user_name: user?.name });
            ArcoVue.Message.success('评分提交成功');
            submitRatingVisible.value = false;
            const res = await axios.get('/api/scripts/' + currentScript.value.script_id);
            currentScript.value = res.data;
          } catch (e) { ArcoVue.Message.error('提交失败'); }
          submitting.value = false;
        };
        
        const submitRatingDirect = async () => {
          if (!ratingForm.user_id) { ArcoVue.Message.warning('请选择评分人'); return; }
          if (!ratingForm.content_score && !ratingForm.market_score && !ratingForm.commercial_score) {
            ArcoVue.Message.warning('请至少填写一项评分'); return;
          }
          submitting.value = true;
          try {
            const user = users.value.find(u => u.user_id === ratingForm.user_id);
            await axios.post('/api/ratings', { ...ratingForm, script_id: currentScript.value.script_id, user_name: user?.name });
            ArcoVue.Message.success('评分提交成功');
            Object.assign(ratingForm, { user_id: '', content_score: null, market_score: null, commercial_score: null, comments: '' });
            const res = await axios.get('/api/scripts/' + currentScript.value.script_id);
            currentScript.value = res.data;
            loadScripts(); // 刷新列表
          } catch (e) { ArcoVue.Message.error('提交失败'); }
          submitting.value = false;
        };
        
        const sendReminderToAll = async () => {
          const pendingUsers = currentScript.value?.pendingRaters?.filter(r => !r.hasRated && !remindedUsers[r.user_id]) || [];
          if (!pendingUsers.length) { ArcoVue.Message.info('没有需要提醒的人员'); return; }
          for (const u of pendingUsers) { await sendReminder(u); }
          ArcoVue.Message.success('已向 ' + pendingUsers.length + ' 人发送提醒');
        };
        
        const sendReminder = async (user) => {
          try {
            await axios.post('/api/reminders', { script_id: currentScript.value.script_id, user_id: user.user_id });
            remindedUsers[user.user_id] = dayjs().format('MM-DD HH:mm');
            ArcoVue.Message.success('提醒已发送给 ' + user.name);
          } catch (e) { ArcoVue.Message.error('发送失败'); }
        };
        
        const openCreateModal = () => {
          Object.assign(editForm, { script_id: '', name: '', feishu_url: '', status: '一卡初稿', genre: '皆可', source_type: '内部团队', writer: '', content_team: '', producer: '', is_project: false });
          editModalVisible.value = true;
        };
        
        const openEditModal = (s) => {
          Object.assign(editForm, { script_id: s.script_id, name: s.name, feishu_url: s.feishu_url || '', status: s.status, genre: s.genre, source_type: s.source_type, writer: s.writer || '', content_team: s.content_team || '', producer: s.producer || '', is_project: !!s.is_project });
          editModalVisible.value = true;
        };
        
        const submitScript = async () => {
          if (!editForm.name) { ArcoVue.Message.warning('请输入剧本名称'); return; }
          submitting.value = true;
          try {
            if (editForm.script_id) {
              await axios.put('/api/scripts/' + editForm.script_id, editForm);
            } else {
              await axios.post('/api/scripts', editForm);
            }
            ArcoVue.Message.success('保存成功');
            editModalVisible.value = false;
            loadScripts();
          } catch (e) { ArcoVue.Message.error('保存失败'); }
          submitting.value = false;
        };
        
        const confirmDeleteScript = (id) => {
          ArcoVue.Modal.warning({
            title: '确认删除',
            content: '删除后无法恢复',
            onOk: async () => {
              await axios.delete('/api/scripts/' + id);
              ArcoVue.Message.success('删除成功');
              loadScripts();
            }
          });
        };
        
        watch(currentPage, async (p) => {
          if (p === 'dashboard') await loadDashboard();
          else if (p === 'scripts') await loadScripts();
          else if (p === 'ratings') await loadRatings();
          else if (p === 'rankings') await loadRankings();
        });
        
        onMounted(async () => { await loadOptions(); await loadDashboard(); });
        
        return {
          currentPage, loading, submitting, kpi, scripts, ratings, rankings, users, options,
          scriptFilters, ratingFilters, ratingDateRange, scriptPagination, ratingPagination,
          ratingModalVisible, ratingTabKey, submitRatingVisible, editModalVisible, currentScript,
          expandedComments, remindedUsers, ratingForm, editForm, avgDimensionScores,
          getScoreClass, getScoreColor, getStatusColor, getOverdueDays, copyToClipboard, toggleComment,
          loadScripts, loadRatings, resetScriptFilters, onTabChange, onSearchScript, onPageChange, onPageSizeChange, onRatingPageChange, onRatingPageSizeChange, scriptPagination,
          openFeishu, openRatingModal, openSubmitRating, submitRating, submitRatingDirect, sendReminder, sendReminderToAll, hasPendingRaters,
          openCreateModal, openEditModal, submitScript, confirmDeleteScript
        };
      }
    });
    
    app.use(ArcoVue);
    for (const [key, component] of Object.entries(ArcoVueIcon)) app.component(key, component);
    app.mount('#app');
  <\/script>
</body>
</html>`)
})

export default app
