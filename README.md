# DeepDrama 短剧评分系统 - 重构工程

## 📦 工程说明

本工程是 **DeepDrama 短剧评分系统** 的完整重构版本,严格按照 `短剧评分系统-开发规范.md` 要求实现。

### 技术栈

**后端:**
- Spring Boot 2.7.18
- MyBatis 2.3.2
- MySQL 8.0
- Alibaba FastJSON 1.2.83
- Java 8 (JDK 1.8) - 严格遵守

**前端:**
- Vue 3.4
- TypeScript 5.3
- Arco Design Vue 2.55
- Vite 5.0
- Axios 1.6

---

## 📁 目录结构

```
deepdrama-refactor/
├── backend/                    # Spring Boot后端工程
│   ├── src/main/java/          # Java源码
│   │   └── com/deepdrama/
│   │       ├── controller/     # Controller层(REST API)
│   │       ├── service/        # Service层(业务逻辑)
│   │       ├── mapper/         # Mapper层(数据访问)
│   │       ├── entity/         # 实体类
│   │       ├── query/          # 查询条件类
│   │       └── common/         # 公共类(Result, PageResult)
│   ├── src/main/resources/
│   │   ├── application.yml     # 配置文件
│   │   └── mapper/             # MyBatis XML映射文件
│   ├── database/
│   │   └── schema.sql          # 数据库结构SQL
│   └── pom.xml                 # Maven依赖配置
│
├── frontend/                   # Vue 3前端工程
│   ├── src/
│   │   ├── views/              # 页面组件
│   │   ├── components/         # 通用组件
│   │   ├── api/                # API封装(Axios)
│   │   ├── types/              # TypeScript类型定义
│   │   └── utils/              # 工具函数
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── 重构指南.md                  # 完整重构指南文档
└── README.md                   # 本文件
```

---

## 🚀 快速开始

### 1. 后端启动

```bash
# 进入后端目录
cd backend

# 配置数据库(修改application.yml)
vim src/main/resources/application.yml
# 修改数据库连接: url, username, password

# 导入数据库结构
mysql -u root -p < database/schema.sql

# Maven打包
mvn clean package

# 运行
java -jar target/score-system-1.0.0.jar

# 后端API运行在: http://localhost:8080/api
```

### 2. 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 访问: http://localhost:3000
```

---

## 📋 已实现功能

### 后端实现 ✅

1. **基础框架**
   - [x] Spring Boot工程结构
   - [x] MyBatis配置
   - [x] 统一响应结果 `Result<T>`
   - [x] 分页结果 `PageResult<T>`

2. **实体类和数据库**
   - [x] Script实体类(剧本)
   - [x] Rating实体类(评分)
   - [x] MySQL数据库表结构
   - [x] 触发器(自动更新平均分)

3. **Mapper层**
   - [x] ScriptMapper接口和XML
   - [x] 支持复杂筛选条件
   - [x] 多选状态筛选
   - [x] 关键词搜索
   - [x] 分页排序

4. **Service层**
   - [x] ScriptService接口和实现
   - [x] 使用FastJSON解析参数
   - [x] 事务管理

5. **Controller层**
   - [x] ScriptController
   - [x] RESTful API设计
   - [x] 统一异常处理

### 前端实现 ✅

1. **基础框架**
   - [x] Vue 3 + Vite工程结构
   - [x] TypeScript配置
   - [x] Arco Design Vue集成
   - [x] Axios封装和拦截器

2. **API封装**
   - [x] request.ts(Axios封装)
   - [x] script.ts(剧本API)
   - [x] 统一响应处理

3. **页面组件**
   - [x] ScriptManagement.vue(剧本管理)
   - [x] 严格使用 `<script setup lang="ts">`
   - [x] 优先使用 `ref` 管理状态
   - [x] Tab切换筛选
   - [x] 搜索和高级筛选
   - [x] 分页功能

---

## 📖 核心文件说明

### 后端核心文件

| 文件路径 | 说明 |
|---------|------|
| `backend/pom.xml` | Maven依赖配置,包含Spring Boot、MyBatis、FastJSON |
| `backend/src/main/java/com/deepdrama/ScoreSystemApplication.java` | 启动类 |
| `backend/src/main/java/com/deepdrama/common/Result.java` | 统一响应格式 |
| `backend/src/main/java/com/deepdrama/entity/Script.java` | 剧本实体类 |
| `backend/src/main/java/com/deepdrama/mapper/ScriptMapper.java` | 剧本Mapper接口 |
| `backend/src/main/resources/mapper/ScriptMapper.xml` | MyBatis SQL映射 |
| `backend/src/main/java/com/deepdrama/service/impl/ScriptServiceImpl.java` | 剧本业务逻辑 |
| `backend/src/main/java/com/deepdrama/controller/ScriptController.java` | 剧本REST API |
| `backend/database/schema.sql` | MySQL数据库表结构 |

### 前端核心文件

| 文件路径 | 说明 |
|---------|------|
| `frontend/package.json` | NPM依赖配置 |
| `frontend/vite.config.ts` | Vite构建配置 |
| `frontend/tsconfig.json` | TypeScript配置 |
| `frontend/src/main.ts` | 应用入口 |
| `frontend/src/api/request.ts` | Axios封装 |
| `frontend/src/api/script.ts` | 剧本API封装 |
| `frontend/src/views/ScriptManagement.vue` | 剧本管理页面 |

---

## 🔧 开发规范要点

### Java后端规范

1. **Java版本**: 严格使用JDK 1.8,禁止Java 9+特性
   - ❌ 禁止: `var`、`record`、文本块、`switch`表达式
   - ✅ 正确: 显式类型声明、传统类、字符串拼接

2. **FastJSON强制要求**
   - ✅ 业务逻辑中必须使用 `com.alibaba.fastjson.JSONObject`
   - ❌ 禁止手动使用Jackson的ObjectMapper

3. **Controller规范**
   - `@RestController` + `@RequestMapping`
   - API路径使用kebab-case
   - 返回 `Result<T>` 统一格式

4. **Service规范**
   - 接口/实现分离
   - `@Transactional` 用于事务管理

5. **Mapper规范**
   - `@Mapper` 注解
   - 多参数使用 `@Param`
   - 复杂SQL写在XML中

### Vue前端规范

1. **组件结构**: 严格使用 `<script setup lang="ts">`
   - ❌ 禁止: Options API、`<script lang="ts">` + `defineComponent`

2. **状态管理**: 优先使用 `ref`,避免过度使用 `reactive`

3. **UI组件**: 使用 Arco Design Vue (`<a-xxx>`)

4. **API调用**: 使用封装的axios实例,统一错误处理

---

## 📊 API对照表

### 剧本管理API

| 功能 | HTTP方法 | 路径 | 参数类型 |
|------|---------|------|---------|
| 剧本列表 | POST | `/api/scripts` | ScriptQuery(JSON) |
| 剧本详情 | GET | `/api/scripts/{id}` | 路径参数 |
| 创建剧本 | POST | `/api/scripts/create` | Script(JSON) |
| 更新剧本 | PUT | `/api/scripts/{id}` | Script(JSON) |
| 删除剧本 | DELETE | `/api/scripts/{id}` | 路径参数 |
| 剧本排行 | GET | `/api/scripts/rankings` | limit参数 |
| 筛选选项 | GET | `/api/scripts/options` | 无 |

### 统一响应格式

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {
    // 具体数据
  }
}
```

---

## 🗄️ 数据库设计

### 核心表结构

1. **users** - 用户表
   - 字段: id, user_id, name, role_type

2. **scripts** - 剧本表
   - 字段: id, script_id, name, status, source_type, genre, writer, content_team, avg_score, rating_count等
   - 索引: script_id(唯一), status, source_type, genre, avg_score等

3. **ratings** - 评分记录表
   - 字段: id, script_id, user_id, content_score, market_score, commercial_score, total_score, comments等
   - 外键: script_id → scripts.id, user_id → users.id

### 触发器

- `trg_after_rating_insert`: 新增评分后自动更新剧本平均分和评分人数
- `trg_after_rating_update`: 更新评分后自动更新剧本平均分
- `trg_after_rating_delete`: 删除评分后自动更新剧本平均分和评分人数

---

## ⚠️ 注意事项

1. **数据迁移**: 需要从原Cloudflare D1数据库导出数据并转换为MySQL格式

2. **环境要求**:
   - JDK 1.8(不支持更高版本)
   - Maven 3.6+
   - MySQL 8.0+
   - Node.js 16+

3. **配置修改**:
   - `backend/src/main/resources/application.yml` - 数据库连接信息
   - `frontend/vite.config.ts` - 后端API代理地址

4. **端口占用**:
   - 后端: 8080
   - 前端: 3000

---

## 📚 完整文档

详细的重构步骤、规范说明、测试方法等,请查看:

👉 **[重构指南.md](./重构指南.md)**

---

## 🎯 下一步工作

完整重构工程已创建,包含:
- ✅ 后端完整代码框架
- ✅ 前端完整工程结构
- ✅ 数据库表结构SQL
- ✅ 核心示例代码
- ✅ 详细重构指南

**需要在本地环境完成的工作:**
1. 安装JDK 1.8和MySQL
2. 从D1导出数据并导入MySQL
3. 运行后端Spring Boot项目
4. 运行前端Vue项目
5. 补全其余页面组件(评分记录、数据看板、排行榜)
6. 完善评分管理API和Controller
7. 全面测试功能

---

## 📞 技术支持

如有问题,请参考:
- [重构指南.md](./重构指南.md) - 详细重构步骤
- [短剧评分系统-开发规范.md](../短剧评分系统-开发规范.md) - 开发规范

---

**本重构工程严格遵循项目开发规范,确保代码质量和可维护性。**
