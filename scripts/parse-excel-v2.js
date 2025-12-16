/**
 * Excel数据解析脚本 v2 - 支持新字段
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// 评分等级映射
const scoreMap = {
  'S+ (特别好)': 100, 'S (非常好)': 90, 'A (好看)': 80, 'B+ (还不错)': 70,
  'B (及格线)': 60, 'C+ (要大改)': 50, 'C (不好)': 40,
  'A(亮点十足)': 85, 'B(略有新意)': 70, 'C(老套/新意少)': 55,
  '要求高': 80, '适中': 60, '要求低': 40, '-': null, '': null
};

// 评分人列表
const raters = [
  { name: '王舒', role: '主编' },
  { name: '陈佳意', role: '制片' },
  { name: '李思雨', role: '评审' },
  { name: '康飞飞', role: '评审' },
  { name: '陈思琪', role: '制片' },
  { name: '董兵雨', role: '评审' },
  { name: '闻博', role: '主编' },
  { name: '杨晓磊', role: '评审' },
  { name: '王圣瑜', role: '制片' }
];

// 内容团队列表
const contentTeams = ['晓娜组', '宗霖组', '葛涛组', '小熊组'];

// 制片团队列表
const producerTeams = ['A组', 'B组', 'C组', 'D组'];

// 编剧列表
const writers = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

// 制片人列表
const producers = ['刘制片', '陈制片', '杨制片', '黄制片'];

function parseScore(value) {
  if (!value || value === '-' || value === '') return null;
  if (scoreMap[value] !== undefined) return scoreMap[value];
  
  const str = String(value).trim();
  if (str.includes('S+')) return 100;
  if (str.includes('S') && !str.includes('+')) return 90;
  if (str.includes('A') && str.includes('亮点')) return 85;
  if (str.includes('A') || str.includes('好看')) return 80;
  if (str.includes('B+') || str.includes('还不错')) return 70;
  if (str.includes('B') && str.includes('新意')) return 70;
  if (str.includes('B') || str.includes('及格')) return 60;
  if (str.includes('C+') || str.includes('大改')) return 50;
  if (str.includes('C') && str.includes('老套')) return 55;
  if (str.includes('C') || str.includes('不好')) return 40;
  if (str.includes('要求高')) return 80;
  if (str.includes('适中')) return 60;
  if (str.includes('要求低')) return 40;
  return null;
}

function mapStatus(status) {
  if (!status) return '一卡初稿';
  const s = status.trim();
  if (s === '一卡') return '一卡初稿';
  if (s === '全本') return '完整剧本';
  if (s.includes('改稿')) return '改稿中';
  if (s.includes('终稿')) return '终稿';
  return '一卡初稿';
}

function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

async function main() {
  const excelPath = process.argv[2] || '/home/user/uploaded_files/王舒剧本评分表.xlsx';
  
  console.log(`Reading Excel file: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const scripts = [];
  const ratings = [];
  const usersSet = new Map();

  // 添加评分人到用户集合
  raters.forEach((r, idx) => {
    usersSet.set(r.name, { userId: `U${String(idx + 1).padStart(3, '0')}`, role: r.role });
  });

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0] || row[0] === '剧名') continue;

    const scriptName = String(row[0] || '').replace(/《|》/g, '').trim();
    if (!scriptName) continue;

    const scriptId = `SP${String(i).padStart(3, '0')}`;
    const team = row[1] || '';
    const contentType = row[2] || '付费';
    const genre = row[3] || '皆可';
    const status = row[4] || '一卡';
    const projectOwner = row[5] || '';
    const remarks = row[31] || '';
    const productionStatus = row[32] || '未制作';

    // 随机生成新字段
    const writer = randomItem(writers);
    const contentTeam = randomItem(contentTeams);
    const producer = randomItem(producers);
    const producerTeam = randomItem(producerTeams);
    const hasProject = !!projectOwner;
    const projectName = hasProject ? `PRJ-${scriptId.replace('SP', '')}` : '';
    const feishuUrl = `https://bytedance.larkoffice.com/docx/script_${scriptId}`;
    const assignStatus = hasProject ? '已分配' : (Math.random() > 0.3 ? '已分配' : '待分配');
    const submitDate = randomDate(new Date('2025-10-01'), new Date('2025-12-16'));

    // 收集评分
    const scriptRatings = [];
    for (let ri = 0; ri < raters.length; ri++) {
      const rater = raters[ri];
      const contentCol = 6 + ri;
      const marketCol = 15 + ri;
      const commercialCol = 23 + ri;
      
      const contentScore = parseScore(row[contentCol]);
      const marketScore = parseScore(row[marketCol]);
      const commercialScore = parseScore(row[commercialCol]);
      
      if (contentScore !== null || marketScore !== null || commercialScore !== null) {
        const scores = [contentScore, marketScore, commercialScore].filter(s => s !== null);
        const totalScore = scores.length > 0 
          ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
          : null;

        const ratingDate = randomDate(new Date(submitDate), new Date('2025-12-16'));
        
        scriptRatings.push({
          scriptId,
          userName: rater.name,
          userRole: rater.role,
          contentScore,
          marketScore,
          commercialScore,
          totalScore,
          ratingDate
        });
      }
    }

    const validRatings = scriptRatings.filter(r => r.totalScore !== null);
    const avgScore = validRatings.length > 0
      ? Number((validRatings.reduce((sum, r) => sum + r.totalScore, 0) / validRatings.length).toFixed(1))
      : 0;

    scripts.push({
      scriptId, name: scriptName, team, contentType, genre,
      status: mapStatus(status), projectOwner, isProject: hasProject ? 1 : 0,
      productionStatus, remarks, avgScore, ratingCount: validRatings.length,
      writer, contentTeam, producer, producerTeam, projectName, feishuUrl, assignStatus, submitDate
    });

    ratings.push(...scriptRatings);
  }

  // 生成用户SQL
  let userSQL = '-- 用户数据\n';
  usersSet.forEach((val, name) => {
    userSQL += `INSERT INTO users (user_id, name, role, department, role_type) VALUES ('${val.userId}', ${escapeSQL(name)}, '内容评审', '内容部', '${val.role}');\n`;
  });

  // 生成剧本SQL
  let scriptSQL = '\n-- 剧本数据\n';
  scripts.forEach(s => {
    scriptSQL += `INSERT INTO scripts (script_id, name, team, content_type, genre, status, source_type, project_owner, is_project, production_status, remarks, avg_score, rating_count, writer, content_team, producer, producer_team, project_name, feishu_url, assign_status, submit_date) VALUES (${escapeSQL(s.scriptId)}, ${escapeSQL(s.name)}, ${escapeSQL(s.team)}, ${escapeSQL(s.contentType)}, ${escapeSQL(s.genre)}, ${escapeSQL(s.status)}, '内部团队', ${escapeSQL(s.projectOwner)}, ${s.isProject}, ${escapeSQL(s.productionStatus)}, ${escapeSQL(s.remarks)}, ${s.avgScore}, ${s.ratingCount}, ${escapeSQL(s.writer)}, ${escapeSQL(s.contentTeam)}, ${escapeSQL(s.producer)}, ${escapeSQL(s.producerTeam)}, ${escapeSQL(s.projectName)}, ${escapeSQL(s.feishuUrl)}, ${escapeSQL(s.assignStatus)}, ${escapeSQL(s.submitDate)});\n`;
  });

  // 生成评分SQL
  let ratingSQL = '\n-- 评分数据\n';
  ratings.forEach(r => {
    const userInfo = usersSet.get(r.userName);
    ratingSQL += `INSERT INTO ratings (script_id, user_id, user_name, user_role, content_score, market_score, commercial_score, total_score, rating_date) VALUES (${escapeSQL(r.scriptId)}, ${escapeSQL(userInfo.userId)}, ${escapeSQL(r.userName)}, ${escapeSQL(r.userRole)}, ${r.contentScore || 'NULL'}, ${r.marketScore || 'NULL'}, ${r.commercialScore || 'NULL'}, ${r.totalScore || 'NULL'}, ${escapeSQL(r.ratingDate)});\n`;
  });

  const fullSQL = userSQL + scriptSQL + ratingSQL;
  
  console.log(`\n=== 数据统计 ===`);
  console.log(`用户数: ${usersSet.size}`);
  console.log(`剧本数: ${scripts.length}`);
  console.log(`评分记录数: ${ratings.length}`);
  
  fs.writeFileSync('/home/user/webapp/seed.sql', fullSQL);
  console.log(`\nSQL文件已生成: /home/user/webapp/seed.sql`);
}

main().catch(console.error);
