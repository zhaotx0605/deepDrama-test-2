-- 添加新字段到scripts表
ALTER TABLE scripts ADD COLUMN writer TEXT; -- 所属编剧
ALTER TABLE scripts ADD COLUMN content_team TEXT; -- 内容团队(晓娜组/宗霖组/葛涛组/小熊组)
ALTER TABLE scripts ADD COLUMN producer TEXT; -- 所属制片
ALTER TABLE scripts ADD COLUMN producer_team TEXT; -- 制片团队
ALTER TABLE scripts ADD COLUMN project_name TEXT; -- 立项项目名称
ALTER TABLE scripts ADD COLUMN feishu_url TEXT; -- 飞书文档URL
ALTER TABLE scripts ADD COLUMN assign_status TEXT DEFAULT '待分配'; -- 分配状态(待分配/已分配)

-- 更新users表添加角色字段
ALTER TABLE users ADD COLUMN role_type TEXT DEFAULT '评审'; -- 角色类型(主编/制片/评审)
