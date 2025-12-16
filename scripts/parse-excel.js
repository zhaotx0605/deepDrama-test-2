/**
 * Excel数据解析脚本 - 将剧本评分表转换为SQL初始化数据
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// 评分等级映射
const scoreMap = {
  'S+ (特别好)': 100,
  'S (非常好)': 90,
  'A (好看)': 80,
  'B+ (还不错)': 70,
  'B (及格线)': 60,
  'C+ (要大改)': 50,
  'C (不好)': 40,
  'A(亮点十足)': 85,
  'B(略有新意)': 70,
  'C(老套/新意少)': 55,
  '要求高': 80,
  '适中': 60,
  '要求低': 40,
  '-': null,
  '': null
};

// 评分人列表
const raters = [
  { name: '王舒', col: 6, dimensions: ['content'] },
  { name: '陈佳意', col: 7, dimensions: ['content', 'market', 'commercial'] },
  { name: '李思雨', col: 8, dimensions: ['content', 'market', 'commercial'] },
  { name: '康飞飞', col: 9, dimensions: ['content', 'market', 'commercial'] },
  { name: '陈思琪', col: 10, dimensions: ['content', 'market', 'commercial'] },
  { name: '董兵雨', col: 11, dimensions: ['content', 'market', 'commercial'] },
  { name: '闻博', col: 12, dimensions: ['content', 'market', 'commercial'] },
  { name: '杨晓磊', col: 13, dimensions: ['content', 'market', 'commercial'] },
  { name: '王圣瑜', col: 14, dimensions: ['content', 'market', 'commercial'] }
];

// 解析评分值
function parseScore(value) {
  if (!value || value === '-' || value === '') return null;
  
  // 直接匹配
  if (scoreMap[value] !== undefined) {
    return scoreMap[value];
  }
  
  // 模糊匹配
  const str = String(value).trim();
  if (str.includes('S+') || str.includes('特别好')) return 100;
  if (str.includes('S') && !str.includes('+') || str.includes('非常好')) return 90;
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

// 状态映射
function mapStatus(status) {
  if (!status) return '一卡初稿';
  const s = status.trim();
  if (s === '一卡') return '一卡初稿';
  if (s === '全本') return '完整剧本';
  if (s.includes('改稿')) return '改稿中';
  if (s.includes('终稿')) return '终稿';
  return '一卡初稿';
}

// 来源类型映射
function mapSourceType(team) {
  if (!team) return '内部团队';
  const t = team.trim();
  if (t.includes('外部') || t.includes('投稿')) return '外部投稿';
  if (t.includes('合作')) return '合作编剧';
  if (t.includes('采购') || t.includes('版权')) return '版权采购';
  return '内部团队';
}

// SQL转义
function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// 主函数
async function main() {
  const excelPath = process.argv[2] || '/home/user/uploaded_files/王舒剧本评分表.xlsx';
  
  console.log(`Reading Excel file: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const scripts = [];
  const ratings = [];
  const usersSet = new Set();

  // 跳过标题行
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

    // 收集该剧本所有评分
    const scriptRatings = [];
    
    // 解析内容评分 (列6-14)
    for (let ri = 0; ri < raters.length; ri++) {
      const rater = raters[ri];
      const contentCol = 6 + ri;
      const marketCol = 15 + ri;  // 题材评分从第15列开始
      const commercialCol = 23 + ri; // 制作评分从第23列开始
      
      const contentScore = parseScore(row[contentCol]);
      const marketScore = parseScore(row[marketCol]);
      const commercialScore = parseScore(row[commercialCol]);
      
      // 只有当有任何评分时才记录
      if (contentScore !== null || marketScore !== null || commercialScore !== null) {
        usersSet.add(rater.name);
        
        // 计算总分（只计算有值的维度）
        const scores = [contentScore, marketScore, commercialScore].filter(s => s !== null);
        const totalScore = scores.length > 0 
          ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
          : null;

        scriptRatings.push({
          scriptId,
          userName: rater.name,
          contentScore,
          marketScore,
          commercialScore,
          totalScore
        });
      }
    }

    // 计算剧本平均分
    const validRatings = scriptRatings.filter(r => r.totalScore !== null);
    const avgScore = validRatings.length > 0
      ? Number((validRatings.reduce((sum, r) => sum + r.totalScore, 0) / validRatings.length).toFixed(1))
      : 0;

    scripts.push({
      scriptId,
      name: scriptName,
      team,
      contentType,
      genre,
      status: mapStatus(status),
      sourceType: mapSourceType(team),
      projectOwner,
      isProject: projectOwner ? 1 : 0,
      productionStatus: productionStatus || '未制作',
      remarks,
      avgScore,
      ratingCount: validRatings.length
    });

    ratings.push(...scriptRatings);
  }

  // 生成用户SQL
  const usersList = Array.from(usersSet);
  let userSQL = '-- 用户数据\n';
  usersList.forEach((name, idx) => {
    const userId = `U${String(idx + 1).padStart(3, '0')}`;
    userSQL += `INSERT INTO users (user_id, name, role, department) VALUES ('${userId}', ${escapeSQL(name)}, '内容评审', '内容部');\n`;
  });

  // 创建用户ID映射
  const userIdMap = {};
  usersList.forEach((name, idx) => {
    userIdMap[name] = `U${String(idx + 1).padStart(3, '0')}`;
  });

  // 生成剧本SQL
  let scriptSQL = '\n-- 剧本数据\n';
  scripts.forEach(s => {
    scriptSQL += `INSERT INTO scripts (script_id, name, team, content_type, genre, status, source_type, project_owner, is_project, production_status, remarks, avg_score, rating_count) VALUES (${escapeSQL(s.scriptId)}, ${escapeSQL(s.name)}, ${escapeSQL(s.team)}, ${escapeSQL(s.contentType)}, ${escapeSQL(s.genre)}, ${escapeSQL(s.status)}, ${escapeSQL(s.sourceType)}, ${escapeSQL(s.projectOwner)}, ${s.isProject}, ${escapeSQL(s.productionStatus)}, ${escapeSQL(s.remarks)}, ${s.avgScore}, ${s.ratingCount});\n`;
  });

  // 生成评分SQL
  let ratingSQL = '\n-- 评分数据\n';
  ratings.forEach(r => {
    const userId = userIdMap[r.userName];
    ratingSQL += `INSERT INTO ratings (script_id, user_id, user_name, content_score, market_score, commercial_score, total_score) VALUES (${escapeSQL(r.scriptId)}, ${escapeSQL(userId)}, ${escapeSQL(r.userName)}, ${r.contentScore || 'NULL'}, ${r.marketScore || 'NULL'}, ${r.commercialScore || 'NULL'}, ${r.totalScore || 'NULL'});\n`;
  });

  const fullSQL = userSQL + scriptSQL + ratingSQL;
  
  // 输出统计
  console.log(`\n=== 数据统计 ===`);
  console.log(`用户数: ${usersList.length}`);
  console.log(`剧本数: ${scripts.length}`);
  console.log(`评分记录数: ${ratings.length}`);
  
  // 写入文件
  const outputPath = path.join(path.dirname(excelPath), '../webapp/seed.sql');
  fs.writeFileSync('/home/user/webapp/seed.sql', fullSQL);
  console.log(`\nSQL文件已生成: /home/user/webapp/seed.sql`);
  
  // 同时输出JSON格式便于调试
  const jsonData = { users: usersList.map((name, idx) => ({ userId: `U${String(idx + 1).padStart(3, '0')}`, name })), scripts, ratingsCount: ratings.length };
  fs.writeFileSync('/home/user/webapp/data.json', JSON.stringify(jsonData, null, 2));
  console.log(`JSON文件已生成: /home/user/webapp/data.json`);
}

main().catch(console.error);
