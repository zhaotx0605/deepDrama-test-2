-- ====================================
-- DeepDrama 短剧评分系统数据库结构
-- 创建日期: 2025-12-17
-- ====================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `deepdrama` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `deepdrama`;

-- ====================================
-- 1. 用户表 (users)
-- ====================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户编号',
  `name` VARCHAR(100) NOT NULL COMMENT '用户姓名',
  `role_type` VARCHAR(50) DEFAULT NULL COMMENT '角色类型(内容/制片/商务/策略)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_name` (`name`),
  KEY `idx_role_type` (`role_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ====================================
-- 2. 剧本表 (scripts)
-- ====================================
CREATE TABLE IF NOT EXISTS `scripts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `script_id` VARCHAR(50) NOT NULL COMMENT '剧本编号',
  `name` VARCHAR(200) NOT NULL COMMENT '剧本名称',
  `preview` TEXT COMMENT '剧本简介',
  `file_url` VARCHAR(500) DEFAULT NULL COMMENT '剧本文件URL',
  `tags` VARCHAR(200) DEFAULT NULL COMMENT '标签(JSON数组)',
  `source_type` VARCHAR(50) DEFAULT NULL COMMENT '投稿类型(外部投稿/内部团队/合作剧组/版权购买)',
  `team` VARCHAR(100) DEFAULT NULL COMMENT '所属团队',
  `status` VARCHAR(50) DEFAULT '一卡初稿' COMMENT '剧本状态(一卡初稿/改稿中/完整剧本/终稿/已废弃)',
  `genre` VARCHAR(50) DEFAULT NULL COMMENT '剧本分类(男频/女频/皆可)',
  `content_type` VARCHAR(50) DEFAULT NULL COMMENT '内容类型(付费/免费)',
  `is_project` TINYINT DEFAULT 0 COMMENT '是否立项(0:否 1:是)',
  `project_owner` VARCHAR(100) DEFAULT NULL COMMENT '项目归属',
  `project_name` VARCHAR(200) DEFAULT NULL COMMENT '项目名称',
  `remarks` TEXT COMMENT '备注',
  `submit_user` VARCHAR(100) DEFAULT NULL COMMENT '提交人',
  `writer` VARCHAR(100) DEFAULT NULL COMMENT '编剧',
  `content_team` VARCHAR(100) DEFAULT NULL COMMENT '内容团队',
  `producer` VARCHAR(100) DEFAULT NULL COMMENT '制片人',
  `producer_team` VARCHAR(100) DEFAULT NULL COMMENT '制片团队',
  `feishu_url` VARCHAR(500) DEFAULT NULL COMMENT '飞书文档链接',
  `assign_status` VARCHAR(50) DEFAULT '待分配' COMMENT '分配状态(待分配/待认领/已认领)',
  `submit_date` DATE DEFAULT NULL COMMENT '提交日期',
  `avg_score` DECIMAL(5,2) DEFAULT 0.00 COMMENT '平均综合评分',
  `rating_count` INT DEFAULT 0 COMMENT '评分人数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_script_id` (`script_id`),
  KEY `idx_name` (`name`),
  KEY `idx_status` (`status`),
  KEY `idx_source_type` (`source_type`),
  KEY `idx_genre` (`genre`),
  KEY `idx_is_project` (`is_project`),
  KEY `idx_writer` (`writer`),
  KEY `idx_content_team` (`content_team`),
  KEY `idx_producer` (`producer`),
  KEY `idx_submit_date` (`submit_date`),
  KEY `idx_avg_score` (`avg_score`),
  KEY `idx_rating_count` (`rating_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='剧本表';

-- ====================================
-- 3. 评分记录表 (ratings)
-- ====================================
CREATE TABLE IF NOT EXISTS `ratings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `script_id` BIGINT UNSIGNED NOT NULL COMMENT '剧本ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `user_role` VARCHAR(50) DEFAULT NULL COMMENT '用户角色',
  `content_score` DECIMAL(5,2) DEFAULT NULL COMMENT '内容分数(0-100)',
  `market_score` DECIMAL(5,2) DEFAULT NULL COMMENT '题材分数(0-100)',
  `compliance_score` DECIMAL(5,2) DEFAULT NULL COMMENT '合规分数(0-100)',
  `commercial_score` DECIMAL(5,2) DEFAULT NULL COMMENT '商业分数(0-100)',
  `total_score` DECIMAL(5,2) DEFAULT NULL COMMENT '综合评分(0-100)',
  `comments` TEXT COMMENT '评语',
  `rating_date` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '评分日期',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_script_id` (`script_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_rating_date` (`rating_date`),
  KEY `idx_total_score` (`total_score`),
  CONSTRAINT `fk_ratings_script` FOREIGN KEY (`script_id`) REFERENCES `scripts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ratings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评分记录表';

-- ====================================
-- 4. 创建触发器: 评分后自动更新剧本平均分
-- ====================================
DELIMITER $$

CREATE TRIGGER `trg_after_rating_insert` 
AFTER INSERT ON `ratings`
FOR EACH ROW
BEGIN
  UPDATE `scripts` 
  SET 
    `avg_score` = (
      SELECT AVG(`total_score`) 
      FROM `ratings` 
      WHERE `script_id` = NEW.`script_id`
    ),
    `rating_count` = (
      SELECT COUNT(*) 
      FROM `ratings` 
      WHERE `script_id` = NEW.`script_id`
    )
  WHERE `id` = NEW.`script_id`;
END$$

CREATE TRIGGER `trg_after_rating_update` 
AFTER UPDATE ON `ratings`
FOR EACH ROW
BEGIN
  UPDATE `scripts` 
  SET 
    `avg_score` = (
      SELECT AVG(`total_score`) 
      FROM `ratings` 
      WHERE `script_id` = NEW.`script_id`
    )
  WHERE `id` = NEW.`script_id`;
END$$

CREATE TRIGGER `trg_after_rating_delete` 
AFTER DELETE ON `ratings`
FOR EACH ROW
BEGIN
  UPDATE `scripts` 
  SET 
    `avg_score` = COALESCE((
      SELECT AVG(`total_score`) 
      FROM `ratings` 
      WHERE `script_id` = OLD.`script_id`
    ), 0.00),
    `rating_count` = (
      SELECT COUNT(*) 
      FROM `ratings` 
      WHERE `script_id` = OLD.`script_id`
    )
  WHERE `id` = OLD.`script_id`;
END$$

DELIMITER ;
