# 在项目根执行（会创建 server\fix_encoding.sql）
@"
-- fix_encoding.sql
-- 备份当前 articles 表（便于回滚）
CREATE TABLE IF NOT EXISTS articles_backup AS SELECT * FROM articles;

-- 将 title 和 summary 从 latin1 -> utf8mb4 修复
UPDATE articles
SET title = CONVERT(BINARY CONVERT(title USING latin1) USING utf8mb4);

UPDATE articles
SET summary = CONVERT(BINARY CONVERT(summary USING latin1) USING utf8mb4);

-- 可选：修复 content 列（如果内容也错编码，可取消注释）
-- UPDATE articles
-- SET content = CONVERT(BINARY CONVERT(content USING latin1) USING utf8mb4);
"@ > .\server\fix_encoding.sql
