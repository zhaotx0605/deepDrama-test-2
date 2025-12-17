# DeepDrama - 短剧内容评分系统

## 项目概述
- **名称**: DeepDrama
- **目标**: 为短剧内容团队提供专业的剧本筛选和评估工具，覆盖剧本管理、多维度评分、数据可视化、排名统计全流程
- **技术栈**: Hono + TypeScript + Cloudflare D1 (SQLite) + Vue 3 + Arco Design + ECharts 5.x

## 访问地址
- **开发环境**: https://3000-igexgvecwlovi6ux7od6z-6532622b.e2b.dev
- **剧本概览**: / (默认首页)
- **剧本管理**: /scripts
- **评分记录**: /ratings
- **剧本排行**: /rankings

## 功能模块

### 1. 剧本概览 (首页)
- **核心KPI指标**: 
  - 总剧本数（主要指标）
  - 立项数
  - 待分配数
  - 平均评分
- **投稿日期筛选**: 支持日期范围筛选，默认不限日期
- **可视化图表**:
  - 剧本状态分布饼图（一卡/全本等）
  - 内容团队统计柱状图（含剧本数量和平均分折线）

### 2. 剧本管理
- **Tab切换**: 全部 / 待评分 / 待认领 / 已立项 / 已放弃
- **详细筛选**: 剧本状态、内容团队、内容类型(男频/女频)、关键词、投稿日期、评分区间
- **表格布局** (15个字段，首末列冻结):
  - **首列冻结**: 剧本编号(100px)、剧本名称(200px，超长显示省略+tooltip)
  - **中间列**: 综合评分(90px，颜色徽章)、评分人数(90px)、剧本状态(100px，颜色标签)、立项状态(90px，已立项/未立项)、项目归属(100px)、编剧(80px)、内容团队(90px)、制片(80px)、制片团队(90px)、类型(70px)、付费类型(80px)、提交日期(110px)、备注(150px，tooltip)
  - **末列冻结**: 操作(180px)
- **视觉优化**:
  - 斑马纹行 + hover高亮
  - 单元格边框清晰分隔
  - 评分颜色编码: ≥80绿色, ≥70蓝色, ≥60橙色, <60红色
- **操作功能**:
  - 看剧本：新标签页打开飞书文档
  - 去评分：右侧抽屉显示评分详情
  - 更多：编辑、复制信息、删除

### 3. 评分抽屉
- **宽度**: 页面的1/3
- **顶部信息**: 剧本详细信息卡片（编号、编剧、团队、类型等）
- **综合评分**: 突出显示大字体评分
- **评分记录列表**: 
  - 按评分时间降序排列
  - 显示评分人头像、姓名、角色标签（主编/制片/内容/评审）
  - 各维度分数（内容/题材/制作）
  - 评语内容
- **去评分按钮**: 右上角，点击打开评分弹框

### 4. 评分记录页面
- **筛选功能**: 评分人、日期范围
- **表格布局** (10个字段，首末列冻结):
  - **首列冻结**: 剧本编号(100px)、剧本名称(180px)
  - **中间列**: 评分人(100px)、角色(90px，颜色标签)、内容评分(90px，颜色样式)、题材评分(90px，颜色样式)、制作评分(90px，颜色样式)、综合评分(100px，颜色徽章)、评分日期(110px)、评语备注(200px，tooltip)
  - **末列冻结**: 操作(100px)
- **视觉优化**:
  - 斑马纹行 + hover高亮
  - 单元格边框清晰分隔
  - 评分颜色编码显示

### 5. 剧本排行榜
- **展示规则**: Top 50，按综合评分降序
- **视觉标识**: 前三名显示🥇🥈🥉
- **展示信息**: 排名、剧本名、评分、评分人数、各维度均分
- **操作**: 查看详情（跳转至剧本管理页打开评分抽屉）

## API接口

### 看板API
| 接口 | 方法 | 参数 | 说明 |
|-----|------|-----|-----|
| /api/dashboard/kpi | GET | start_date, end_date | 获取KPI指标 |
| /api/dashboard/status-distribution | GET | start_date, end_date | 状态分布 |
| /api/dashboard/team-distribution | GET | start_date, end_date | 团队统计 |

### 剧本API
| 接口 | 方法 | 说明 |
|-----|------|-----|
| /api/scripts | GET | 列表（支持tab/status/content_team/genre/keyword/日期筛选/分页） |
| /api/scripts/:id | GET | 详情（含评分记录，按时间降序） |
| /api/scripts | POST | 创建剧本 |
| /api/scripts/:id | PUT | 更新剧本 |
| /api/scripts/:id | DELETE | 删除剧本及其评分 |

### 评分API
| 接口 | 方法 | 说明 |
|-----|------|-----|
| /api/ratings | GET | 列表（支持script_id/user_id/日期/分数筛选） |
| /api/ratings | POST | 创建评分（自动计算综合分，更新剧本平均分） |
| /api/ratings/:id | PUT | 更新评分（未锁定记录） |

### 其他API
| 接口 | 方法 | 说明 |
|-----|------|-----|
| /api/rankings | GET | Top50排行榜（含各维度均分） |
| /api/users | GET | 用户列表 |
| /api/options | GET | 筛选选项（团队/状态/编剧/制片等） |

## 数据模型

### Scripts (剧本表)
| 字段 | 类型 | 说明 |
|-----|------|-----|
| script_id | TEXT | 剧本编号(SP001格式) |
| name | TEXT | 剧本名称 |
| writer | TEXT | 所属编剧 |
| content_team | TEXT | 内容团队(晓娜组/宗霖组等) |
| producer | TEXT | 所属制片 |
| producer_team | TEXT | 制片团队 |
| team | TEXT | 所属团队(剧无敌/剧出圈等) |
| status | TEXT | 剧本状态(一卡/全本等) |
| genre | TEXT | 内容类型(男频/女频/皆可) |
| content_type | TEXT | 付费类型(付费/红果) |
| is_project | INTEGER | 是否立项 |
| project_name | TEXT | 立项项目名称 |
| feishu_url | TEXT | 飞书文档URL |
| assign_status | TEXT | 分配状态(待分配/已分配) |
| avg_score | REAL | 平均评分 |
| rating_count | INTEGER | 评分人数 |

### Ratings (评分表)
| 字段 | 类型 | 说明 |
|-----|------|-----|
| script_id | TEXT | 关联剧本ID |
| user_id | TEXT | 评分人ID |
| user_name | TEXT | 评分人姓名 |
| user_role | TEXT | 评分人角色 |
| content_score | INTEGER | 内容评分(0-100) |
| market_score | INTEGER | 题材评分(0-100) |
| commercial_score | INTEGER | 制作评分(0-100) |
| total_score | REAL | 综合评分(自动计算) |
| comments | TEXT | 评分意见 |
| is_locked | INTEGER | 是否锁定 |
| rating_date | DATE | 评分日期 |

### Users (用户表)
| 字段 | 类型 | 说明 |
|-----|------|-----|
| user_id | TEXT | 用户ID |
| name | TEXT | 姓名 |
| role_type | TEXT | 角色类型(主编/制片/内容/评审) |
| department | TEXT | 部门 |

## 数据统计
- **用户数**: 9人
- **剧本数**: 55个
- **评分记录数**: 479条
- **立项数**: 21个
- **待分配**: 8个
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

## 项目结构
```
webapp/
├── src/
│   └── index.tsx          # Hono后端+前端HTML
├── migrations/
│   ├── 0001_initial_schema.sql
│   └── 0002_add_new_fields.sql
├── seed.sql               # 测试数据
├── ecosystem.config.cjs   # PM2配置
├── wrangler.jsonc         # Cloudflare配置
├── package.json
└── vite.config.ts
```

## 更新日志
- **2025-12-17**: 
  - **重构表格布局**: 剧本管理和评分记录表格重新设计
  - **剧本管理表格**: 15个字段按新顺序排列，首列（编号、名称）和末列（操作）冻结
  - **评分记录表格**: 10个字段按新顺序排列，首列（编号、名称）和末列（操作）冻结
  - **左侧菜单优化**: 移除图标，仅显示文字，更简洁
  - **视觉增强**: 添加斑马纹、单元格边框、评分颜色编码
  - **新增功能**: 评分记录页面"查看详情"按钮
- **2025-12-16**: 
  - 评分抽屉宽度调整为页面1/3
  - 评分记录按时间降序显示
  - 评分人旁显示角色标签
  - 添加完整编辑剧本弹框功能
  - 优化立项状态显示（✅ + 项目ID + 名称）
  - 新增Tab切换（全部/待分配）
  - 投稿日期筛选默认不限

## 待完成功能
- [ ] 评分趋势图表(日/周/月)
- [ ] 批量导入剧本
- [ ] 评分锁定/解锁功能
- [ ] 用户权限管理
- [ ] 数据导出功能

## 下一步开发建议
1. 实现评分趋势图表API和前端展示
2. 添加批量导入Excel功能
3. 完善用户角色权限控制
4. 部署到Cloudflare Pages生产环境
