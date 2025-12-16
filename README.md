# DeepDrama - 短剧内容评分系统

## 项目概述
- **名称**: DeepDrama
- **目标**: 为短剧内容团队提供专业的剧本筛选和评估工具，覆盖剧本管理、多维度评分、数据可视化、排名统计全流程
- **技术栈**: Hono + TypeScript + Cloudflare D1 + TailwindCSS + ECharts

## 访问地址
- **开发环境**: https://3000-iaopyantbe74hetfvbgis-6532622b.e2b.dev
- **数据看板**: /
- **剧本管理**: /scripts
- **评分记录**: /ratings
- **剧本排行**: /rankings

## 功能模块

### 1. 数据看板 (/)
- **KPI指标**: 总提交数、立项数、已评分数、待评分数、平均评分
- **状态分布饼图**: 一卡初稿/改稿中/完整剧本/终稿
- **来源类型柱状图**: 内部团队/外部投稿/合作编剧/版权采购
- **团队数据统计**: 各团队剧本数量和平均评分对比

### 2. 剧本管理 (/scripts)
- **快捷筛选**: 全部、待评分、已立项
- **详细筛选**: 剧本状态、来源类型、所属团队、评分区间、关键词搜索
- **剧本操作**: 
  - 查看评分详情（抽屉展示）
  - 编辑剧本信息
  - 删除剧本
  - 预览飞书文档
- **数据展示**: 编号、名称、评分、评级(S/A/B+/B/C+/C)、标签、团队、状态、立项状态

### 3. 评分记录 (/ratings)
- **评分维度**: 内容评分、题材评分、合规评分、制作评分（各0-100分）
- **综合评分**: 自动计算各维度平均值
- **筛选功能**: 评分人、分数区间、日期范围
- **操作功能**: 查看详情、编辑评分（未锁定记录）

### 4. 剧本排行 (/rankings)
- **排名规则**: 综合评分降序，展示Top 50
- **视觉标识**: 前三名显示🥇🥈🥉奖牌
- **展示信息**: 排名、剧本名称、平均评分、评分人数、各维度得分

## API接口

### 看板API
| 接口 | 方法 | 说明 |
|-----|------|-----|
| /api/dashboard/kpi | GET | 获取KPI指标数据 |
| /api/dashboard/status-distribution | GET | 获取状态分布数据 |
| /api/dashboard/source-distribution | GET | 获取来源类型分布 |
| /api/dashboard/team-distribution | GET | 获取团队统计数据 |
| /api/dashboard/score-trend | GET | 获取评分趋势(支持day/week/month) |

### 剧本API
| 接口 | 方法 | 说明 |
|-----|------|-----|
| /api/scripts | GET | 获取剧本列表（支持分页和筛选） |
| /api/scripts/:id | GET | 获取剧本详情（含评分记录） |
| /api/scripts | POST | 创建剧本 |
| /api/scripts/:id | PUT | 更新剧本 |
| /api/scripts/:id | DELETE | 删除剧本 |

### 评分API
| 接口 | 方法 | 说明 |
|-----|------|-----|
| /api/ratings | GET | 获取评分记录列表 |
| /api/ratings/:id | GET | 获取评分详情 |
| /api/ratings | POST | 创建评分 |
| /api/ratings/:id | PUT | 更新评分 |

### 其他API
| 接口 | 方法 | 说明 |
|-----|------|-----|
| /api/rankings | GET | 获取Top50排行榜 |
| /api/users | GET | 获取用户列表 |
| /api/options | GET | 获取筛选选项 |

## 数据模型

### Scripts (剧本表)
| 字段 | 类型 | 说明 |
|-----|------|-----|
| script_id | TEXT | 剧本编号(SP001格式) |
| name | TEXT | 剧本名称 |
| team | TEXT | 所属团队 |
| status | TEXT | 剧本状态 |
| source_type | TEXT | 来源类型 |
| genre | TEXT | 男女频(男频/女频/皆可) |
| content_type | TEXT | 内容类型(付费/红果) |
| is_project | INTEGER | 是否立项 |
| avg_score | REAL | 平均评分 |
| rating_count | INTEGER | 评分人数 |

### Ratings (评分表)
| 字段 | 类型 | 说明 |
|-----|------|-----|
| script_id | TEXT | 关联剧本ID |
| user_id | TEXT | 评分人ID |
| user_name | TEXT | 评分人姓名 |
| content_score | INTEGER | 内容评分(0-100) |
| market_score | INTEGER | 题材评分(0-100) |
| commercial_score | INTEGER | 制作评分(0-100) |
| total_score | REAL | 综合评分(自动计算) |

### Users (用户表)
| 字段 | 类型 | 说明 |
|-----|------|-----|
| user_id | TEXT | 用户ID |
| name | TEXT | 姓名 |
| role | TEXT | 角色 |
| department | TEXT | 部门 |

## 数据统计（当前）
- **用户数**: 9人
- **剧本数**: 55个
- **评分记录数**: 479条
- **平均评分**: 65.1分

## 本地开发

```bash
# 安装依赖
npm install

# 初始化数据库
npm run db:migrate:local
npm run db:seed

# 构建项目
npm run build

# 启动开发服务
npm run dev:sandbox

# 或使用PM2
pm2 start ecosystem.config.cjs
```

## 部署到Cloudflare Pages

```bash
# 创建D1数据库
npx wrangler d1 create deepdrama-production

# 应用迁移
npm run db:migrate:prod

# 部署
npm run deploy:prod
```

## 更新日期
2025-12-16
