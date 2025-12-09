// server/routes/ai.js
const express = require('express');
const router = express.Router();

// POST /api/v1/ai/draft { title, keywords }
router.post('/draft', async (req, res) => {
    try {
        const { title, keywords } = req.body || {};
        // 简单 mock：基于 title/keywords 生成模板段落
        const draft = `<p>基于 “${title || '标题'}” 的 AI 初稿：这是第一段示例内容。关键词：${(keywords || []).join(', ')}</p>`;
        res.json({ draft });
    } catch (err) {
        res.status(500).json({ error: 'server_error' });
    }
});

module.exports = router;
