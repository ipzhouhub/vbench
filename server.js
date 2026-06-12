// 本地开发服务器 - 模拟 Vercel 的 API 路由 + 静态文件服务
// 使用方法: node server.js
// 环境变量从 .env.local 读取

const http = require('http');
const fs = require('fs');
const path = require('path');

// 加载 .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim();
    });
}

const PORT = process.env.PORT || 3000;

const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.mp4': 'video/mp4', '.txt': 'text/plain', '.svg': 'image/svg+xml',
};

async function handleFeedback(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Method not allowed'); }

    let body = '';
    for await (const chunk of req) body += chunk;

    const { name, rating, aspect, content } = JSON.parse(body || '{}');

    if (!process.env.WECOM_WEBHOOK_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: '缺少 WECOM_WEBHOOK_KEY 环境变量' }));
    }
    if (!rating || rating < 1 || rating > 5) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: '请选择 1-5 的评分' }));
    }
    if (!content || content.trim().length < 2) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: '反馈内容至少 2 个字符' }));
    }

    const ratingLabels = { 1: '很差', 2: '一般', 3: '还行', 4: '很好', 5: '超赞' };
    const webhookUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.WECOM_WEBHOOK_KEY}`;
    const msg = {
        msgtype: 'markdown',
        markdown: {
            content: [
                '## 🎬 T2V 体验反馈',
                `> **反馈人**: ${name || '匿名'}`,
                `> **体验评分**: ${'⭐'.repeat(rating)} ${ratingLabels[rating] || rating}`,
                `> **满意方面**: ${aspect || '未选择'}`,
                '',
                `**详细反馈**:\n${content.trim()}`
            ].join('\n')
        }
    };

    try {
        const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg),
        });
        const data = await resp.json();
        if (data.errcode !== 0) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: '企业微信返回错误', detail: data.errmsg }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '转发失败', detail: e.message }));
    }
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // API 路由
    if (url.pathname === '/api/feedback') {
        return handleFeedback(req, res);
    }

    // 静态文件
    let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
    filePath = path.normalize(filePath);
    if (!filePath.startsWith(__dirname)) { res.writeHead(403); return res.end(); }

    try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404); res.end('Not Found');
        }
    } catch {
        res.writeHead(404); res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 本地开发服务器: http://localhost:${PORT}`);
    console.log(`   API: POST http://localhost:${PORT}/api/feedback`);
    console.log(`   WECOM_WEBHOOK_KEY: ${process.env.WECOM_WEBHOOK_KEY ? '✅ 已加载' : '❌ 未配置'}\n`);
});
