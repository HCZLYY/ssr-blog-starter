-- create_tables.sql
CREATE DATABASE IF NOT EXISTS ssr_blog CHARACTER SET = 'utf8mb4' COLLATE = 'utf8mb4_general_ci';
USE ssr_blog;

CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  content LONGTEXT NOT NULL,
  author VARCHAR(100) DEFAULT 'unknown',
  tags VARCHAR(255) DEFAULT '',
  status VARCHAR(50) DEFAULT 'published',
  deleted TINYINT(1) DEFAULT 0,
  views INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_deleted (deleted),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
