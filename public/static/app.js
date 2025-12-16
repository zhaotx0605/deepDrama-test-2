/**
 * DeepDrama - 短剧内容评分系统 前端应用
 */

// API 基础配置
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// 全局状态
const state = {
  currentPage: 'dashboard',
  scripts: [],
  ratings: [],
  rankings: [],
  options: { teams: [], statuses: [], sourceTypes: [], genres: [] },
  users: [],
  pagination: { page: 1, limit: 20, total: 0 },
  filters: {}
};

// 工具函数
function formatScore(score) {
  return score ? Number(score).toFixed(1) : '-';
}

function getRatingClass(score) {
  if (score >= 90) return 'score-s';
  if (score >= 80) return 'score-a';
  if (score >= 70) return 'score-b-plus';
  if (score >= 60) return 'score-b';
  if (score >= 50) return 'score-c-plus';
  return 'score-c';
}

function getRating(score) {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  return 'C';
}

function showLoading() {
  document.getElementById('main-content').innerHTML = `
    <div class="flex items-center justify-center h-64">
      <i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
    </div>
  `;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Modal 控制
function openModal(content) {
  document.getElementById('modal-content').innerHTML = content;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Drawer 控制
function openDrawer(content) {
  document.getElementById('drawer-content').innerHTML = content;
  document.getElementById('drawer-overlay').classList.remove('hidden');
  document.getElementById('drawer').classList.remove('drawer-closed');
  document.getElementById('drawer').classList.add('drawer-open');
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.add('hidden');
  document.getElementById('drawer').classList.remove('drawer-open');
  document.getElementById('drawer').classList.add('drawer-closed');
}

// ==================== 数据看板页面 ====================

async function renderDashboard() {
  showLoading();
  
  try {
    const [kpi, statusDist, sourceDist, teamDist] = await Promise.all([
      api.get('/dashboard/kpi'),
      api.get('/dashboard/status-distribution'),
      api.get('/dashboard/source-distribution'),
      api.get('/dashboard/team-distribution')
    ]);

    const html = `
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-800">数据看板</h2>
        <p class="text-gray-500 mt-1">实时数据统计与可视化分析</p>
      </div>
      
      <!-- KPI 卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div class="stat-card bg-white rounded-xl shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm">总提交数</p>
              <p class="text-3xl font-bold text-gray-800 mt-1">${kpi.data.totalSubmissions}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <i class="fas fa-file-alt text-blue-500 text-xl"></i>
            </div>
          </div>
        </div>
        
        <div class="stat-card bg-white rounded-xl shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm">立项数</p>
              <p class="text-3xl font-bold text-green-600 mt-1">${kpi.data.projectCount}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <i class="fas fa-check-circle text-green-500 text-xl"></i>
            </div>
          </div>
        </div>
        
        <div class="stat-card bg-white rounded-xl shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm">已评分数</p>
              <p class="text-3xl font-bold text-purple-600 mt-1">${kpi.data.ratedCount}</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <i class="fas fa-star text-purple-500 text-xl"></i>
            </div>
          </div>
        </div>
        
        <div class="stat-card bg-white rounded-xl shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm">待评分数</p>
              <p class="text-3xl font-bold text-orange-600 mt-1">${kpi.data.pendingCount}</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <i class="fas fa-clock text-orange-500 text-xl"></i>
            </div>
          </div>
        </div>
        
        <div class="stat-card bg-white rounded-xl shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm">平均评分</p>
              <p class="text-3xl font-bold text-pink-600 mt-1">${kpi.data.avgScore}</p>
            </div>
            <div class="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
              <i class="fas fa-chart-line text-pink-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 图表区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            <i class="fas fa-chart-pie text-blue-500 mr-2"></i>剧本状态分布
          </h3>
          <div id="status-chart" style="height: 300px;"></div>
        </div>
        
        <div class="bg-white rounded-xl shadow p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            <i class="fas fa-chart-bar text-green-500 mr-2"></i>来源类型分布
          </h3>
          <div id="source-chart" style="height: 300px;"></div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">
          <i class="fas fa-users text-purple-500 mr-2"></i>团队数据统计
        </h3>
        <div id="team-chart" style="height: 300px;"></div>
      </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
    
    // 渲染状态分布饼图
    const statusChart = echarts.init(document.getElementById('status-chart'));
    statusChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 10, top: 'center' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
        data: statusDist.data.map(item => ({ name: item.status, value: item.count }))
      }]
    });
    
    // 渲染来源类型柱状图
    const sourceChart = echarts.init(document.getElementById('source-chart'));
    sourceChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: sourceDist.data.map(item => item.source_type) },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: sourceDist.data.map(item => item.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ])
        }
      }]
    });
    
    // 渲染团队统计图
    const teamChart = echarts.init(document.getElementById('team-chart'));
    teamChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['剧本数量', '平均评分'] },
      xAxis: { type: 'category', data: teamDist.data.map(item => item.team) },
      yAxis: [
        { type: 'value', name: '数量', position: 'left' },
        { type: 'value', name: '评分', position: 'right', min: 0, max: 100 }
      ],
      series: [
        {
          name: '剧本数量',
          type: 'bar',
          data: teamDist.data.map(item => item.count),
          itemStyle: { color: '#4facfe' }
        },
        {
          name: '平均评分',
          type: 'line',
          yAxisIndex: 1,
          data: teamDist.data.map(item => item.avg_score ? Number(item.avg_score).toFixed(1) : 0),
          itemStyle: { color: '#f5576c' }
        }
      ]
    });
    
    // 响应式
    window.addEventListener('resize', () => {
      statusChart.resize();
      sourceChart.resize();
      teamChart.resize();
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    document.getElementById('main-content').innerHTML = `
      <div class="text-center text-red-500 py-8">
        <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
        <p>数据加载失败，请刷新重试</p>
      </div>
    `;
  }
}

// ==================== 剧本管理页面 ====================

async function renderScripts() {
  showLoading();
  
  try {
    // 加载筛选选项
    const optionsRes = await api.get('/options');
    state.options = optionsRes.data;
    
    // 构建查询参数
    const params = new URLSearchParams({
      page: state.pagination.page,
      limit: state.pagination.limit,
      ...state.filters
    });
    
    const res = await api.get(`/scripts?${params}`);
    state.scripts = res.data.data;
    state.pagination.total = res.data.total;
    
    const html = `
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">剧本管理</h2>
          <p class="text-gray-500 mt-1">管理和筛选所有剧本</p>
        </div>
        <button onclick="openAddScriptModal()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
          <i class="fas fa-plus mr-2"></i>新增剧本
        </button>
      </div>
      
      <!-- 快捷筛选 -->
      <div class="bg-white rounded-xl shadow p-4 mb-6">
        <div class="flex flex-wrap gap-2">
          <button onclick="quickFilter('')" class="px-4 py-2 rounded-lg ${!state.filters.is_project && !state.filters.pending ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}">
            全部
          </button>
          <button onclick="quickFilter('pending')" class="px-4 py-2 rounded-lg ${state.filters.pending === 'true' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}">
            待评分
          </button>
          <button onclick="quickFilter('project')" class="px-4 py-2 rounded-lg ${state.filters.is_project === '1' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}">
            已立项
          </button>
        </div>
      </div>
      
      <!-- 详细筛选 -->
      <div class="bg-white rounded-xl shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">剧本状态</label>
            <select id="filter-status" onchange="applyFilter()" class="w-full border rounded-lg px-3 py-2">
              <option value="">全部状态</option>
              ${state.options.statuses.map(s => `<option value="${s}" ${state.filters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">来源类型</label>
            <select id="filter-source" onchange="applyFilter()" class="w-full border rounded-lg px-3 py-2">
              <option value="">全部来源</option>
              ${state.options.sourceTypes.map(s => `<option value="${s}" ${state.filters.source_type === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">所属团队</label>
            <select id="filter-team" onchange="applyFilter()" class="w-full border rounded-lg px-3 py-2">
              <option value="">全部团队</option>
              ${state.options.teams.map(t => `<option value="${t}" ${state.filters.team === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">评分区间</label>
            <div class="flex gap-2">
              <input type="number" id="filter-min-score" placeholder="最低" min="0" max="100" class="w-1/2 border rounded-lg px-3 py-2" onchange="applyFilter()">
              <input type="number" id="filter-max-score" placeholder="最高" min="0" max="100" class="w-1/2 border rounded-lg px-3 py-2" onchange="applyFilter()">
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">搜索</label>
            <input type="text" id="filter-keyword" placeholder="剧本名称/编号" class="w-full border rounded-lg px-3 py-2" onkeyup="if(event.key==='Enter')applyFilter()">
          </div>
        </div>
      </div>
      
      <!-- 剧本列表 -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">编号</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">剧本名称</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">评分</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">评级</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">团队</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">状态</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">立项</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${state.scripts.map(script => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-600">${script.script_id}</td>
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-800">${script.name}</div>
                  <div class="text-xs text-gray-500">${script.genre} · ${script.content_type}</div>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="font-bold text-lg ${script.avg_score >= 70 ? 'text-green-600' : script.avg_score >= 60 ? 'text-blue-600' : 'text-gray-600'}">${formatScore(script.avg_score)}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-3 py-1 rounded-full text-white text-sm ${getRatingClass(script.avg_score)}">${getRating(script.avg_score)}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${script.team || '-'}</td>
                <td class="px-4 py-3 text-center">
                  <span class="tag bg-blue-100 text-blue-700">${script.status}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  ${script.is_project ? '<span class="text-green-500"><i class="fas fa-check-circle"></i></span>' : '<span class="text-gray-400"><i class="fas fa-minus-circle"></i></span>'}
                </td>
                <td class="px-4 py-3 text-center">
                  <button onclick="viewScript('${script.script_id}')" class="text-blue-500 hover:text-blue-700 mx-1" title="评分详情">
                    <i class="fas fa-star"></i>
                  </button>
                  <button onclick="editScript('${script.script_id}')" class="text-green-500 hover:text-green-700 mx-1" title="编辑">
                    <i class="fas fa-edit"></i>
                  </button>
                  ${script.file_url ? `<a href="${script.file_url}" target="_blank" class="text-purple-500 hover:text-purple-700 mx-1" title="预览"><i class="fas fa-external-link-alt"></i></a>` : ''}
                  <button onclick="deleteScript('${script.script_id}')" class="text-red-500 hover:text-red-700 mx-1" title="删除">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${state.scripts.length === 0 ? '<div class="text-center py-8 text-gray-500">暂无数据</div>' : ''}
      </div>
      
      <!-- 分页 -->
      <div class="mt-6 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          共 ${state.pagination.total} 条记录
        </div>
        <div class="flex gap-2">
          <button onclick="changePage(${state.pagination.page - 1})" ${state.pagination.page <= 1 ? 'disabled' : ''} class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
            上一页
          </button>
          <span class="px-4 py-2">第 ${state.pagination.page} 页</span>
          <button onclick="changePage(${state.pagination.page + 1})" ${state.pagination.page * state.pagination.limit >= state.pagination.total ? 'disabled' : ''} class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
            下一页
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
    
  } catch (error) {
    console.error('Scripts error:', error);
    document.getElementById('main-content').innerHTML = `
      <div class="text-center text-red-500 py-8">
        <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
        <p>数据加载失败，请刷新重试</p>
      </div>
    `;
  }
}

function quickFilter(type) {
  state.filters = {};
  state.pagination.page = 1;
  
  if (type === 'pending') {
    state.filters.pending = 'true';
  } else if (type === 'project') {
    state.filters.is_project = '1';
  }
  
  renderScripts();
}

function applyFilter() {
  state.filters = {};
  state.pagination.page = 1;
  
  const status = document.getElementById('filter-status')?.value;
  const source = document.getElementById('filter-source')?.value;
  const team = document.getElementById('filter-team')?.value;
  const minScore = document.getElementById('filter-min-score')?.value;
  const maxScore = document.getElementById('filter-max-score')?.value;
  const keyword = document.getElementById('filter-keyword')?.value;
  
  if (status) state.filters.status = status;
  if (source) state.filters.source_type = source;
  if (team) state.filters.team = team;
  if (minScore) state.filters.min_score = minScore;
  if (maxScore) state.filters.max_score = maxScore;
  if (keyword) state.filters.keyword = keyword;
  
  renderScripts();
}

function changePage(page) {
  if (page < 1) return;
  state.pagination.page = page;
  renderScripts();
}

async function viewScript(scriptId) {
  try {
    const res = await api.get(`/scripts/${scriptId}`);
    const script = res.data;
    
    const content = `
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-800">评分详情</h3>
          <button onclick="closeDrawer()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="mb-6">
          <h4 class="font-semibold text-lg text-gray-800">${script.name}</h4>
          <p class="text-sm text-gray-500">${script.script_id} · ${script.team || '未分配团队'}</p>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <div class="text-center">
            <p class="text-gray-500 text-sm">综合评分</p>
            <p class="text-4xl font-bold ${script.avg_score >= 70 ? 'text-green-600' : script.avg_score >= 60 ? 'text-blue-600' : 'text-gray-600'}">${formatScore(script.avg_score)}</p>
            <span class="inline-block mt-2 px-4 py-1 rounded-full text-white ${getRatingClass(script.avg_score)}">${getRating(script.avg_score)}</span>
          </div>
        </div>
        
        <div class="mb-4">
          <h5 class="font-semibold text-gray-700 mb-3">评分记录 (${script.ratings?.length || 0}条)</h5>
          <div class="space-y-3">
            ${(script.ratings || []).map(r => `
              <div class="bg-white border rounded-lg p-3">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-medium text-gray-800">${r.user_name}</span>
                    <span class="text-xs text-gray-500 ml-2">${r.rating_date || '未知日期'}</span>
                  </div>
                  <span class="font-bold text-lg ${r.total_score >= 70 ? 'text-green-600' : r.total_score >= 60 ? 'text-blue-600' : 'text-gray-600'}">${formatScore(r.total_score)}</span>
                </div>
                <div class="mt-2 flex gap-4 text-sm text-gray-600">
                  <span>内容: ${r.content_score || '-'}</span>
                  <span>题材: ${r.market_score || '-'}</span>
                  <span>制作: ${r.commercial_score || '-'}</span>
                </div>
                ${r.comments ? `<p class="mt-2 text-sm text-gray-500">${r.comments}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    openDrawer(content);
  } catch (error) {
    showToast('加载失败', 'error');
  }
}

async function editScript(scriptId) {
  try {
    const res = await api.get(`/scripts/${scriptId}`);
    const script = res.data;
    
    openAddScriptModal(script);
  } catch (error) {
    showToast('加载失败', 'error');
  }
}

function openAddScriptModal(script = null) {
  const isEdit = !!script;
  
  const content = `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold text-gray-800">${isEdit ? '编辑剧本' : '新增剧本'}</h3>
        <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form id="script-form" class="space-y-4">
        <input type="hidden" id="form-script-id" value="${script?.script_id || ''}">
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">剧本名称 *</label>
          <input type="text" id="form-name" value="${script?.name || ''}" required class="w-full border rounded-lg px-3 py-2">
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">剧本状态</label>
            <select id="form-status" class="w-full border rounded-lg px-3 py-2">
              <option value="一卡初稿" ${script?.status === '一卡初稿' ? 'selected' : ''}>一卡初稿</option>
              <option value="改稿中" ${script?.status === '改稿中' ? 'selected' : ''}>改稿中</option>
              <option value="完整剧本" ${script?.status === '完整剧本' ? 'selected' : ''}>完整剧本</option>
              <option value="终稿" ${script?.status === '终稿' ? 'selected' : ''}>终稿</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">来源类型</label>
            <select id="form-source-type" class="w-full border rounded-lg px-3 py-2">
              <option value="内部团队" ${script?.source_type === '内部团队' ? 'selected' : ''}>内部团队</option>
              <option value="外部投稿" ${script?.source_type === '外部投稿' ? 'selected' : ''}>外部投稿</option>
              <option value="合作编剧" ${script?.source_type === '合作编剧' ? 'selected' : ''}>合作编剧</option>
              <option value="版权采购" ${script?.source_type === '版权采购' ? 'selected' : ''}>版权采购</option>
            </select>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">所属团队</label>
            <input type="text" id="form-team" value="${script?.team || ''}" class="w-full border rounded-lg px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">男女频</label>
            <select id="form-genre" class="w-full border rounded-lg px-3 py-2">
              <option value="男频" ${script?.genre === '男频' ? 'selected' : ''}>男频</option>
              <option value="女频" ${script?.genre === '女频' ? 'selected' : ''}>女频</option>
              <option value="皆可" ${script?.genre === '皆可' ? 'selected' : ''}>皆可</option>
            </select>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">飞书文档地址</label>
          <input type="url" id="form-file-url" value="${script?.file_url || ''}" placeholder="https://..." class="w-full border rounded-lg px-3 py-2">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea id="form-remarks" rows="3" class="w-full border rounded-lg px-3 py-2">${script?.remarks || ''}</textarea>
        </div>
        
        <div class="flex items-center">
          <input type="checkbox" id="form-is-project" ${script?.is_project ? 'checked' : ''} class="mr-2">
          <label for="form-is-project" class="text-sm text-gray-700">已立项</label>
        </div>
        
        <div class="flex justify-end gap-3 pt-4">
          <button type="button" onclick="closeModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
          <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">保存</button>
        </div>
      </form>
    </div>
  `;
  
  openModal(content);
  
  document.getElementById('script-form').onsubmit = async (e) => {
    e.preventDefault();
    await saveScript();
  };
}

async function saveScript() {
  const scriptId = document.getElementById('form-script-id').value;
  const data = {
    name: document.getElementById('form-name').value,
    status: document.getElementById('form-status').value,
    source_type: document.getElementById('form-source-type').value,
    team: document.getElementById('form-team').value,
    genre: document.getElementById('form-genre').value,
    file_url: document.getElementById('form-file-url').value,
    remarks: document.getElementById('form-remarks').value,
    is_project: document.getElementById('form-is-project').checked
  };
  
  try {
    if (scriptId) {
      await api.put(`/scripts/${scriptId}`, data);
      showToast('更新成功');
    } else {
      await api.post('/scripts', data);
      showToast('创建成功');
    }
    closeModal();
    renderScripts();
  } catch (error) {
    showToast('保存失败', 'error');
  }
}

async function deleteScript(scriptId) {
  if (!confirm('确定要删除这个剧本吗？此操作不可恢复。')) return;
  
  try {
    await api.delete(`/scripts/${scriptId}`);
    showToast('删除成功');
    renderScripts();
  } catch (error) {
    showToast('删除失败', 'error');
  }
}

// ==================== 评分记录页面 ====================

async function renderRatings() {
  showLoading();
  
  try {
    const params = new URLSearchParams({
      page: state.pagination.page,
      limit: state.pagination.limit,
      ...state.filters
    });
    
    const [res, usersRes] = await Promise.all([
      api.get(`/ratings?${params}`),
      api.get('/users')
    ]);
    
    state.ratings = res.data.data;
    state.users = usersRes.data;
    state.pagination.total = res.data.total;
    
    const html = `
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">评分记录</h2>
        <p class="text-gray-500 mt-1">查看和管理所有评分记录</p>
      </div>
      
      <!-- 筛选 -->
      <div class="bg-white rounded-xl shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">评分人</label>
            <select id="filter-user" onchange="applyRatingFilter()" class="w-full border rounded-lg px-3 py-2">
              <option value="">全部评分人</option>
              ${state.users.map(u => `<option value="${u.user_id}" ${state.filters.user_id === u.user_id ? 'selected' : ''}>${u.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">评分区间</label>
            <div class="flex gap-2">
              <input type="number" id="filter-min-score" placeholder="最低" min="0" max="100" class="w-1/2 border rounded-lg px-3 py-2" onchange="applyRatingFilter()">
              <input type="number" id="filter-max-score" placeholder="最高" min="0" max="100" class="w-1/2 border rounded-lg px-3 py-2" onchange="applyRatingFilter()">
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">开始日期</label>
            <input type="date" id="filter-start-date" class="w-full border rounded-lg px-3 py-2" onchange="applyRatingFilter()">
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">结束日期</label>
            <input type="date" id="filter-end-date" class="w-full border rounded-lg px-3 py-2" onchange="applyRatingFilter()">
          </div>
        </div>
      </div>
      
      <!-- 评分列表 -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">剧本</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">评分人</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">内容</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">题材</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">制作</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">综合</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">日期</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${state.ratings.map(r => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-800">${r.script_name || r.script_id}</div>
                  <div class="text-xs text-gray-500">${r.script_id}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${r.user_name}</td>
                <td class="px-4 py-3 text-center text-sm">${r.content_score || '-'}</td>
                <td class="px-4 py-3 text-center text-sm">${r.market_score || '-'}</td>
                <td class="px-4 py-3 text-center text-sm">${r.commercial_score || '-'}</td>
                <td class="px-4 py-3 text-center">
                  <span class="font-bold ${r.total_score >= 70 ? 'text-green-600' : r.total_score >= 60 ? 'text-blue-600' : 'text-gray-600'}">${formatScore(r.total_score)}</span>
                </td>
                <td class="px-4 py-3 text-center text-sm text-gray-500">${r.rating_date || '-'}</td>
                <td class="px-4 py-3 text-center">
                  <button onclick="viewRating(${r.id})" class="text-blue-500 hover:text-blue-700 mx-1" title="详情">
                    <i class="fas fa-eye"></i>
                  </button>
                  ${!r.is_locked ? `<button onclick="editRating(${r.id})" class="text-green-500 hover:text-green-700 mx-1" title="编辑"><i class="fas fa-edit"></i></button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${state.ratings.length === 0 ? '<div class="text-center py-8 text-gray-500">暂无数据</div>' : ''}
      </div>
      
      <!-- 分页 -->
      <div class="mt-6 flex justify-between items-center">
        <div class="text-sm text-gray-600">共 ${state.pagination.total} 条记录</div>
        <div class="flex gap-2">
          <button onclick="changeRatingPage(${state.pagination.page - 1})" ${state.pagination.page <= 1 ? 'disabled' : ''} class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50">上一页</button>
          <span class="px-4 py-2">第 ${state.pagination.page} 页</span>
          <button onclick="changeRatingPage(${state.pagination.page + 1})" ${state.pagination.page * state.pagination.limit >= state.pagination.total ? 'disabled' : ''} class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50">下一页</button>
        </div>
      </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
    
  } catch (error) {
    console.error('Ratings error:', error);
    document.getElementById('main-content').innerHTML = `
      <div class="text-center text-red-500 py-8">
        <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
        <p>数据加载失败，请刷新重试</p>
      </div>
    `;
  }
}

function applyRatingFilter() {
  state.filters = {};
  state.pagination.page = 1;
  
  const userId = document.getElementById('filter-user')?.value;
  const minScore = document.getElementById('filter-min-score')?.value;
  const maxScore = document.getElementById('filter-max-score')?.value;
  const startDate = document.getElementById('filter-start-date')?.value;
  const endDate = document.getElementById('filter-end-date')?.value;
  
  if (userId) state.filters.user_id = userId;
  if (minScore) state.filters.min_score = minScore;
  if (maxScore) state.filters.max_score = maxScore;
  if (startDate) state.filters.start_date = startDate;
  if (endDate) state.filters.end_date = endDate;
  
  renderRatings();
}

function changeRatingPage(page) {
  if (page < 1) return;
  state.pagination.page = page;
  renderRatings();
}

async function viewRating(id) {
  try {
    const res = await api.get(`/ratings/${id}`);
    const r = res.data;
    
    const content = `
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-800">评分详情</h3>
          <button onclick="closeDrawer()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-500">剧本名称</p>
            <p class="font-semibold text-gray-800">${r.script_name || r.script_id}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-sm text-gray-500">评分人</p>
              <p class="font-semibold text-gray-800">${r.user_name}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-sm text-gray-500">评分日期</p>
              <p class="font-semibold text-gray-800">${r.rating_date || '-'}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-4 gap-4 text-center">
            <div class="bg-blue-50 rounded-lg p-4">
              <p class="text-xs text-gray-500">内容评分</p>
              <p class="text-2xl font-bold text-blue-600">${r.content_score || '-'}</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4">
              <p class="text-xs text-gray-500">题材评分</p>
              <p class="text-2xl font-bold text-green-600">${r.market_score || '-'}</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-4">
              <p class="text-xs text-gray-500">制作评分</p>
              <p class="text-2xl font-bold text-purple-600">${r.commercial_score || '-'}</p>
            </div>
            <div class="bg-orange-50 rounded-lg p-4">
              <p class="text-xs text-gray-500">综合评分</p>
              <p class="text-2xl font-bold text-orange-600">${formatScore(r.total_score)}</p>
            </div>
          </div>
          
          ${r.comments ? `
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-sm text-gray-500 mb-2">评分意见</p>
              <p class="text-gray-800">${r.comments}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    openDrawer(content);
  } catch (error) {
    showToast('加载失败', 'error');
  }
}

async function editRating(id) {
  try {
    const res = await api.get(`/ratings/${id}`);
    const r = res.data;
    
    const content = `
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-800">编辑评分</h3>
          <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form id="rating-form" class="space-y-4">
          <input type="hidden" id="rating-id" value="${r.id}">
          
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <p class="text-sm text-gray-500">剧本名称</p>
            <p class="font-semibold text-gray-800">${r.script_name || r.script_id}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">内容评分 (0-100)</label>
              <input type="number" id="rating-content" value="${r.content_score || ''}" min="0" max="100" class="w-full border rounded-lg px-3 py-2">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">题材评分 (0-100)</label>
              <input type="number" id="rating-market" value="${r.market_score || ''}" min="0" max="100" class="w-full border rounded-lg px-3 py-2">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">合规评分 (0-100)</label>
              <input type="number" id="rating-compliance" value="${r.compliance_score || ''}" min="0" max="100" class="w-full border rounded-lg px-3 py-2">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">制作评分 (0-100)</label>
              <input type="number" id="rating-commercial" value="${r.commercial_score || ''}" min="0" max="100" class="w-full border rounded-lg px-3 py-2">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">评分意见</label>
            <textarea id="rating-comments" rows="4" class="w-full border rounded-lg px-3 py-2">${r.comments || ''}</textarea>
          </div>
          
          <div class="flex justify-end gap-3 pt-4">
            <button type="button" onclick="closeModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
            <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">保存</button>
          </div>
        </form>
      </div>
    `;
    
    openModal(content);
    
    document.getElementById('rating-form').onsubmit = async (e) => {
      e.preventDefault();
      await saveRating();
    };
  } catch (error) {
    showToast('加载失败', 'error');
  }
}

async function saveRating() {
  const id = document.getElementById('rating-id').value;
  const data = {
    content_score: document.getElementById('rating-content').value ? parseInt(document.getElementById('rating-content').value) : null,
    market_score: document.getElementById('rating-market').value ? parseInt(document.getElementById('rating-market').value) : null,
    compliance_score: document.getElementById('rating-compliance').value ? parseInt(document.getElementById('rating-compliance').value) : null,
    commercial_score: document.getElementById('rating-commercial').value ? parseInt(document.getElementById('rating-commercial').value) : null,
    comments: document.getElementById('rating-comments').value
  };
  
  try {
    await api.put(`/ratings/${id}`, data);
    showToast('更新成功');
    closeModal();
    renderRatings();
  } catch (error) {
    showToast(error.response?.data?.error || '保存失败', 'error');
  }
}

// ==================== 剧本排行页面 ====================

async function renderRankings() {
  showLoading();
  
  try {
    const res = await api.get('/rankings');
    state.rankings = res.data;
    
    const html = `
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">剧本排行榜</h2>
        <p class="text-gray-500 mt-1">TOP 50 高分剧本排名</p>
      </div>
      
      <!-- 排行榜 -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600 w-20">排名</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">剧本名称</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">平均评分</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">评分人数</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">内容</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">题材</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">制作</th>
              <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${state.rankings.map(script => `
              <tr class="hover:bg-gray-50 ${script.rank <= 3 ? 'bg-yellow-50' : ''}">
                <td class="px-4 py-3 text-center">
                  ${script.medal ? `<span class="text-2xl">${script.medal}</span>` : `<span class="text-lg font-bold text-gray-400">${script.rank}</span>`}
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-800">${script.name}</div>
                  <div class="text-xs text-gray-500">${script.script_id} · ${script.team || '未分配'} · ${script.genre}</div>
                </td>
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center">
                    <span class="text-2xl font-bold ${script.avg_score >= 80 ? 'text-green-600' : script.avg_score >= 70 ? 'text-blue-600' : 'text-gray-600'}">${formatScore(script.avg_score)}</span>
                    <span class="ml-2 px-2 py-1 rounded-full text-white text-xs ${getRatingClass(script.avg_score)}">${script.rating}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-center text-gray-600">${script.rater_count || 0}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-600">${formatScore(script.avg_content_score)}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-600">${formatScore(script.avg_market_score)}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-600">${formatScore(script.avg_commercial_score)}</td>
                <td class="px-4 py-3 text-center">
                  <button onclick="viewScript('${script.script_id}')" class="text-blue-500 hover:text-blue-700 mx-1" title="查看详情">
                    <i class="fas fa-eye"></i>
                  </button>
                  <a href="/ratings?script_id=${script.script_id}" class="text-purple-500 hover:text-purple-700 mx-1" title="查看所有评分">
                    <i class="fas fa-list"></i>
                  </a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${state.rankings.length === 0 ? '<div class="text-center py-8 text-gray-500">暂无数据</div>' : ''}
      </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
    
  } catch (error) {
    console.error('Rankings error:', error);
    document.getElementById('main-content').innerHTML = `
      <div class="text-center text-red-500 py-8">
        <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
        <p>数据加载失败，请刷新重试</p>
      </div>
    `;
  }
}

// ==================== 路由初始化 ====================

function initRouter() {
  const path = window.location.pathname;
  
  state.pagination = { page: 1, limit: 20, total: 0 };
  state.filters = {};
  
  if (path === '/' || path === '/dashboard') {
    state.currentPage = 'dashboard';
    renderDashboard();
  } else if (path === '/scripts') {
    state.currentPage = 'scripts';
    renderScripts();
  } else if (path === '/ratings') {
    state.currentPage = 'ratings';
    // 检查URL参数
    const params = new URLSearchParams(window.location.search);
    if (params.get('script_id')) {
      state.filters.script_id = params.get('script_id');
    }
    renderRatings();
  } else if (path === '/rankings') {
    state.currentPage = 'rankings';
    renderRankings();
  }
}

// 事件监听
document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});

// 启动应用
document.addEventListener('DOMContentLoaded', initRouter);
