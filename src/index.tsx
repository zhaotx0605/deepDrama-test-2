import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'

// 类型定义
type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// 启用CORS
app.use('/api/*', cors())

// 静态文件服务
app.use('/static/*', serveStatic())

// ==================== 数据看板 API ====================

// 获取KPI指标
app.get('/api/dashboard/kpi', async (c) => {
  const db = c.env.DB
  
  const [totalScripts, projectScripts, ratedScripts, avgScoreResult] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM scripts').first(),
    db.prepare('SELECT COUNT(*) as count FROM scripts WHERE is_project = 1').first(),
    db.prepare('SELECT COUNT(DISTINCT script_id) as count FROM ratings').first(),
    db.prepare('SELECT AVG(avg_score) as avg FROM scripts WHERE avg_score > 0').first()
  ])

  // 待评分数量 = 总数 - 已评分数
  const pendingCount = (totalScripts?.count || 0) - (ratedScripts?.count || 0)

  return c.json({
    totalSubmissions: totalScripts?.count || 0,
    projectCount: projectScripts?.count || 0,
    ratedCount: ratedScripts?.count || 0,
    pendingCount: pendingCount > 0 ? pendingCount : 0,
    avgScore: avgScoreResult?.avg ? Number(avgScoreResult.avg).toFixed(1) : '0'
  })
})

// 获取状态分布（饼图）
app.get('/api/dashboard/status-distribution', async (c) => {
  const db = c.env.DB
  const result = await db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM scripts 
    GROUP BY status
  `).all()
  
  return c.json(result.results || [])
})

// 获取来源类型分布（柱状图）
app.get('/api/dashboard/source-distribution', async (c) => {
  const db = c.env.DB
  const result = await db.prepare(`
    SELECT source_type, COUNT(*) as count 
    FROM scripts 
    GROUP BY source_type
  `).all()
  
  return c.json(result.results || [])
})

// 获取团队分布
app.get('/api/dashboard/team-distribution', async (c) => {
  const db = c.env.DB
  const result = await db.prepare(`
    SELECT team, COUNT(*) as count, AVG(avg_score) as avg_score
    FROM scripts 
    WHERE team IS NOT NULL AND team != ''
    GROUP BY team
    ORDER BY count DESC
  `).all()
  
  return c.json(result.results || [])
})

// 获取评分趋势（折线图）
app.get('/api/dashboard/score-trend', async (c) => {
  const db = c.env.DB
  const period = c.req.query('period') || 'day'
  
  let dateFormat = '%Y-%m-%d'
  if (period === 'week') {
    dateFormat = '%Y-W%W'
  } else if (period === 'month') {
    dateFormat = '%Y-%m'
  }
  
  const result = await db.prepare(`
    SELECT strftime('${dateFormat}', rating_date) as date, 
           AVG(total_score) as avg_score,
           COUNT(*) as count
    FROM ratings 
    WHERE total_score IS NOT NULL
    GROUP BY strftime('${dateFormat}', rating_date)
    ORDER BY date
  `).all()
  
  return c.json(result.results || [])
})

// ==================== 剧本管理 API ====================

// 获取剧本列表（支持筛选和分页）
app.get('/api/scripts', async (c) => {
  const db = c.env.DB
  const { status, source_type, team, genre, is_project, min_score, max_score, keyword, page = '1', limit = '20' } = c.req.query()
  
  let sql = 'SELECT * FROM scripts WHERE 1=1'
  const params: any[] = []
  
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (source_type) {
    sql += ' AND source_type = ?'
    params.push(source_type)
  }
  if (team) {
    sql += ' AND team = ?'
    params.push(team)
  }
  if (genre) {
    sql += ' AND genre = ?'
    params.push(genre)
  }
  if (is_project !== undefined && is_project !== '') {
    sql += ' AND is_project = ?'
    params.push(is_project === 'true' || is_project === '1' ? 1 : 0)
  }
  if (min_score) {
    sql += ' AND avg_score >= ?'
    params.push(parseFloat(min_score))
  }
  if (max_score) {
    sql += ' AND avg_score <= ?'
    params.push(parseFloat(max_score))
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR script_id LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  
  // 获取总数
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
  const countResult = await db.prepare(countSql).bind(...params).first()
  
  // 分页
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const offset = (pageNum - 1) * limitNum
  sql += ' ORDER BY avg_score DESC, created_at DESC LIMIT ? OFFSET ?'
  params.push(limitNum, offset)
  
  const result = await db.prepare(sql).bind(...params).all()
  
  return c.json({
    data: result.results || [],
    total: countResult?.total || 0,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil((countResult?.total || 0) / limitNum)
  })
})

// 获取单个剧本详情
app.get('/api/scripts/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  const script = await db.prepare('SELECT * FROM scripts WHERE script_id = ? OR id = ?').bind(id, id).first()
  
  if (!script) {
    return c.json({ error: '剧本不存在' }, 404)
  }
  
  // 获取该剧本的评分记录
  const ratings = await db.prepare(`
    SELECT r.*, u.name as user_display_name
    FROM ratings r
    LEFT JOIN users u ON r.user_id = u.user_id
    WHERE r.script_id = ?
    ORDER BY r.rating_date DESC
  `).bind(script.script_id).all()
  
  return c.json({
    ...script,
    ratings: ratings.results || []
  })
})

// 创建剧本
app.post('/api/scripts', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  // 生成script_id
  const lastScript = await db.prepare('SELECT script_id FROM scripts ORDER BY id DESC LIMIT 1').first()
  let nextNum = 1
  if (lastScript?.script_id) {
    const match = String(lastScript.script_id).match(/SP(\d+)/)
    if (match) {
      nextNum = parseInt(match[1]) + 1
    }
  }
  const scriptId = `SP${String(nextNum).padStart(3, '0')}`
  
  const result = await db.prepare(`
    INSERT INTO scripts (script_id, name, preview, file_url, tags, source_type, team, status, genre, content_type, is_project, project_owner, remarks, submit_user)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    scriptId,
    body.name,
    body.preview || null,
    body.file_url || null,
    body.tags ? JSON.stringify(body.tags) : null,
    body.source_type || '内部团队',
    body.team || null,
    body.status || '一卡初稿',
    body.genre || '皆可',
    body.content_type || '付费',
    body.is_project ? 1 : 0,
    body.project_owner || null,
    body.remarks || null,
    body.submit_user || null
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
  
  const fields = ['name', 'preview', 'file_url', 'tags', 'source_type', 'team', 'status', 'genre', 'content_type', 'is_project', 'project_owner', 'remarks', 'production_status']
  
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
  
  if (updates.length === 0) {
    return c.json({ error: '没有需要更新的字段' }, 400)
  }
  
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
  
  // 先删除相关评分
  await db.prepare('DELETE FROM ratings WHERE script_id = ?').bind(id).run()
  // 再删除剧本
  await db.prepare('DELETE FROM scripts WHERE script_id = ? OR id = ?').bind(id, id).run()
  
  return c.json({ success: true })
})

// ==================== 评分记录 API ====================

// 获取评分记录列表
app.get('/api/ratings', async (c) => {
  const db = c.env.DB
  const { script_id, user_id, start_date, end_date, min_score, max_score, page = '1', limit = '20' } = c.req.query()
  
  let sql = `
    SELECT r.*, s.name as script_name, s.status as script_status, s.avg_score as script_avg_score
    FROM ratings r
    LEFT JOIN scripts s ON r.script_id = s.script_id
    WHERE 1=1
  `
  const params: any[] = []
  
  if (script_id) {
    sql += ' AND r.script_id = ?'
    params.push(script_id)
  }
  if (user_id) {
    sql += ' AND r.user_id = ?'
    params.push(user_id)
  }
  if (start_date) {
    sql += ' AND r.rating_date >= ?'
    params.push(start_date)
  }
  if (end_date) {
    sql += ' AND r.rating_date <= ?'
    params.push(end_date)
  }
  if (min_score) {
    sql += ' AND r.total_score >= ?'
    params.push(parseFloat(min_score))
  }
  if (max_score) {
    sql += ' AND r.total_score <= ?'
    params.push(parseFloat(max_score))
  }
  
  // 获取总数
  const countSql = sql.replace(/SELECT r\.\*, s\.name as script_name.*FROM/, 'SELECT COUNT(*) as total FROM')
  const countResult = await db.prepare(countSql).bind(...params).first()
  
  // 分页
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const offset = (pageNum - 1) * limitNum
  sql += ' ORDER BY r.rating_date DESC, r.id DESC LIMIT ? OFFSET ?'
  params.push(limitNum, offset)
  
  const result = await db.prepare(sql).bind(...params).all()
  
  return c.json({
    data: result.results || [],
    total: countResult?.total || 0,
    page: pageNum,
    limit: limitNum
  })
})

// 获取单条评分详情
app.get('/api/ratings/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  const rating = await db.prepare(`
    SELECT r.*, s.name as script_name, s.status as script_status
    FROM ratings r
    LEFT JOIN scripts s ON r.script_id = s.script_id
    WHERE r.id = ?
  `).bind(id).first()
  
  if (!rating) {
    return c.json({ error: '评分记录不存在' }, 404)
  }
  
  return c.json(rating)
})

// 创建评分
app.post('/api/ratings', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  // 计算总分
  const scores = [body.content_score, body.market_score, body.compliance_score, body.commercial_score].filter(s => s !== null && s !== undefined)
  const totalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  
  await db.prepare(`
    INSERT INTO ratings (script_id, user_id, user_name, user_role, content_score, market_score, compliance_score, commercial_score, total_score, comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.script_id,
    body.user_id,
    body.user_name,
    body.user_role || '内容评审',
    body.content_score ?? null,
    body.market_score ?? null,
    body.compliance_score ?? null,
    body.commercial_score ?? null,
    totalScore,
    body.comments || null
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
  
  // 检查是否锁定
  const existing = await db.prepare('SELECT is_locked, script_id FROM ratings WHERE id = ?').bind(id).first()
  if (existing?.is_locked) {
    return c.json({ error: '该评分记录已锁定，无法修改' }, 403)
  }
  
  // 计算总分
  const scores = [body.content_score, body.market_score, body.compliance_score, body.commercial_score].filter(s => s !== null && s !== undefined)
  const totalScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  
  await db.prepare(`
    UPDATE ratings 
    SET content_score = ?, market_score = ?, compliance_score = ?, commercial_score = ?, total_score = ?, comments = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.content_score ?? null,
    body.market_score ?? null,
    body.compliance_score ?? null,
    body.commercial_score ?? null,
    totalScore,
    body.comments || null,
    id
  ).run()
  
  // 更新剧本平均分
  if (existing?.script_id) {
    await updateScriptAvgScore(db, String(existing.script_id))
  }
  
  return c.json({ success: true })
})

// 辅助函数：更新剧本平均分
async function updateScriptAvgScore(db: D1Database, scriptId: string) {
  const avgResult = await db.prepare(`
    SELECT AVG(total_score) as avg, COUNT(*) as count
    FROM ratings 
    WHERE script_id = ? AND total_score IS NOT NULL
  `).bind(scriptId).first()
  
  await db.prepare(`
    UPDATE scripts SET avg_score = ?, rating_count = ?, updated_at = CURRENT_TIMESTAMP
    WHERE script_id = ?
  `).bind(
    avgResult?.avg || 0,
    avgResult?.count || 0,
    scriptId
  ).run()
}

// ==================== 剧本排行 API ====================

// 获取排行榜（Top 50）
app.get('/api/rankings', async (c) => {
  const db = c.env.DB
  
  const result = await db.prepare(`
    SELECT s.*, 
           (SELECT COUNT(*) FROM ratings r WHERE r.script_id = s.script_id) as rater_count,
           (SELECT AVG(content_score) FROM ratings r WHERE r.script_id = s.script_id AND content_score IS NOT NULL) as avg_content_score,
           (SELECT AVG(market_score) FROM ratings r WHERE r.script_id = s.script_id AND market_score IS NOT NULL) as avg_market_score,
           (SELECT AVG(commercial_score) FROM ratings r WHERE r.script_id = s.script_id AND commercial_score IS NOT NULL) as avg_commercial_score
    FROM scripts s
    WHERE s.avg_score > 0
    ORDER BY s.avg_score DESC
    LIMIT 50
  `).all()
  
  // 添加排名信息
  const rankings = (result.results || []).map((item: any, index: number) => ({
    ...item,
    rank: index + 1,
    medal: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null,
    rating: getRating(item.avg_score)
  }))
  
  return c.json(rankings)
})

// 获取评级
function getRating(score: number): string {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C+'
  return 'C'
}

// ==================== 用户 API ====================

// 获取所有用户
app.get('/api/users', async (c) => {
  const db = c.env.DB
  const result = await db.prepare('SELECT * FROM users ORDER BY name').all()
  return c.json(result.results || [])
})

// ==================== 筛选选项 API ====================

// 获取筛选选项
app.get('/api/options', async (c) => {
  const db = c.env.DB
  
  const [teams, statuses, sourceTypes, genres] = await Promise.all([
    db.prepare('SELECT DISTINCT team FROM scripts WHERE team IS NOT NULL AND team != "" ORDER BY team').all(),
    db.prepare('SELECT DISTINCT status FROM scripts ORDER BY status').all(),
    db.prepare('SELECT DISTINCT source_type FROM scripts ORDER BY source_type').all(),
    db.prepare('SELECT DISTINCT genre FROM scripts ORDER BY genre').all()
  ])
  
  return c.json({
    teams: (teams.results || []).map((r: any) => r.team),
    statuses: (statuses.results || []).map((r: any) => r.status),
    sourceTypes: (sourceTypes.results || []).map((r: any) => r.source_type),
    genres: (genres.results || []).map((r: any) => r.genre)
  })
})

// ==================== 前端页面渲染 ====================

// 主页面HTML模板
const getHtmlTemplate = (title: string, page: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - DeepDrama</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      .sidebar-active { background-color: #3b82f6; color: white; }
      .stat-card { transition: transform 0.2s; }
      .stat-card:hover { transform: translateY(-2px); }
      .modal-overlay { background-color: rgba(0,0,0,0.5); }
      .drawer { transition: transform 0.3s ease-in-out; }
      .drawer-open { transform: translateX(0); }
      .drawer-closed { transform: translateX(100%); }
      .medal-gold { color: #FFD700; }
      .medal-silver { color: #C0C0C0; }
      .medal-bronze { color: #CD7F32; }
      .score-s { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .score-a { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
      .score-b-plus { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
      .score-b { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
      .score-c-plus { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
      .score-c { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
      .tag { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 12px; margin-right: 4px; }
    </style>
</head>
<body class="bg-gray-100 min-h-screen">
    <div id="app" class="flex">
        <!-- 侧边栏 -->
        <aside class="w-64 bg-gray-900 min-h-screen fixed left-0 top-0">
            <div class="p-6">
                <h1 class="text-2xl font-bold text-white flex items-center">
                    <i class="fas fa-film mr-3"></i>DeepDrama
                </h1>
                <p class="text-gray-400 text-sm mt-1">短剧内容评分系统</p>
            </div>
            <nav class="mt-6">
                <a href="/" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 ${page === 'dashboard' ? 'sidebar-active' : ''}">
                    <i class="fas fa-chart-pie w-5 mr-3"></i>数据看板
                </a>
                <a href="/scripts" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 ${page === 'scripts' ? 'sidebar-active' : ''}">
                    <i class="fas fa-scroll w-5 mr-3"></i>剧本管理
                </a>
                <a href="/ratings" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 ${page === 'ratings' ? 'sidebar-active' : ''}">
                    <i class="fas fa-star w-5 mr-3"></i>评分记录
                </a>
                <a href="/rankings" class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 ${page === 'rankings' ? 'sidebar-active' : ''}">
                    <i class="fas fa-trophy w-5 mr-3"></i>剧本排行
                </a>
            </nav>
        </aside>
        
        <!-- 主内容区 -->
        <main class="ml-64 flex-1 p-8" id="main-content">
            <!-- 内容由JavaScript动态加载 -->
        </main>
    </div>
    
    <!-- 抽屉组件 -->
    <div id="drawer-overlay" class="fixed inset-0 modal-overlay z-40 hidden"></div>
    <div id="drawer" class="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 drawer drawer-closed overflow-y-auto">
        <div id="drawer-content"></div>
    </div>
    
    <!-- Modal组件 -->
    <div id="modal-overlay" class="fixed inset-0 modal-overlay z-40 hidden flex items-center justify-center">
        <div id="modal" class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div id="modal-content"></div>
        </div>
    </div>
    
    <script src="/static/app.js"></script>
</body>
</html>
`

// 页面路由
app.get('/', (c) => c.html(getHtmlTemplate('数据看板', 'dashboard')))
app.get('/scripts', (c) => c.html(getHtmlTemplate('剧本管理', 'scripts')))
app.get('/ratings', (c) => c.html(getHtmlTemplate('评分记录', 'ratings')))
app.get('/rankings', (c) => c.html(getHtmlTemplate('剧本排行', 'rankings')))

export default app
