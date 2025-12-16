-- DeepDrama Database Schema
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT '内容评审',
  email TEXT,
  department TEXT DEFAULT '内容部',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 剧本表
CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  script_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  preview TEXT,
  file_url TEXT,
  tags TEXT, -- JSON array stored as text
  source_type TEXT DEFAULT '内部团队',
  team TEXT,
  status TEXT DEFAULT '一卡初稿',
  genre TEXT DEFAULT '男频', -- 男频/女频/皆可
  content_type TEXT DEFAULT '付费', -- 付费/红果
  is_project INTEGER DEFAULT 0,
  project_owner TEXT,
  production_status TEXT DEFAULT '未制作',
  submit_date DATE DEFAULT CURRENT_DATE,
  submit_user TEXT,
  avg_score REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 评分表
CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  script_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT DEFAULT '内容评审',
  content_score INTEGER, -- 内容评分 0-100
  market_score INTEGER,  -- 题材/市场评分 0-100
  compliance_score INTEGER, -- 合规评分 (暂未使用)
  commercial_score INTEGER, -- 制作/商业评分 0-100
  total_score REAL, -- 综合评分 (自动计算)
  comments TEXT,
  is_locked INTEGER DEFAULT 0,
  rating_date DATE DEFAULT CURRENT_DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (script_id) REFERENCES scripts(script_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_scripts_status ON scripts(status);
CREATE INDEX IF NOT EXISTS idx_scripts_is_project ON scripts(is_project);
CREATE INDEX IF NOT EXISTS idx_scripts_team ON scripts(team);
CREATE INDEX IF NOT EXISTS idx_scripts_avg_score ON scripts(avg_score DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_script_id ON ratings(script_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_date ON ratings(rating_date DESC);
