// 反馈 API 服务 - 部署到自有服务器，配合 nginx 反向代理使用
// 启动: node feedback-server.js
// PM2: pm2 start feedback-server.js --name vbench-feedback
// 环境变量: QY_WEBHOOK=<企业微信webhook key>

const http = require('http');

const PORT = 3890;
const WEBHOOK_KEY = process.env.QY_WEBHOOK;

if (!WEBHOOK_KEY) {
    console.error('❌ 缺少环境变量 QY_WEBHOOK，请先设置:');
    console.error('   export QY_WEBHOOK="你的webhook-key"');
    process.exit(1);
}

const WEBHOOK_URL = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${WEBHOOK_KEY}`;

// 内存级限流
const rateMap = new Map();
function checkRate(ip) {
    const now = Date.now();
    const list = (rateMap.get(ip) || []).filter(t => now - t < 60000);
    if (list.length >= 5) return false;
    list.push(now);
    rateMap.set(ip, list);
    return true;
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.method !== 'POST')    { res.writeHead(405); return res.end('Method not allowed'); }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
            || req.socket.remoteAddress || 'unknown';

    if (!checkRate(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: '请求过于频繁，请稍后再试' }));
    }

    let body = '';
    for await (const chunk of req) body += chunk;

    let data;
    try { data = JSON.parse(body); } catch { data = {}; }

    const { name, rating, aspect, content } = data;

    if (!rating || rating < 1 || rating > 5) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: '请选择 1-5 的评分' }));
    }
    if (!content || content.trim().length < 2) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: '反馈内容至少 2 个字符' }));
    }

    const labels = { 1: '很差', 2: '一般', 3: '还行', 4: '很好', 5: '超赞' };
    const msg = {
        msgtype: 'markdown',
        markdown: {
            content: [
                '## 🎬 T2V 体验反馈',
                `> **反馈人**: ${name || '匿名'}`,
                `> **体验评分**: ${'⭐'.repeat(rating)} ${labels[rating]}`,
                `> **满意方面**: ${aspect || '未选择'}`,
                `> **来源 IP**: ${ip}`,
                '',
                `**详细反馈**:\n${content.trim()}`
            ].join('\n')
        }
    };

    try {
        const resp = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg),
        });
        const result = await resp.json();
        if (result.errcode !== 0) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: '企业微信接口错误', detail: result.errmsg }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    } catch (e) {
        console.error('Webhook error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '转发失败', detail: e.message }));
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`✅ 反馈 API 已启动: http://127.0.0.1:${PORT}`);
    console.log(`   Webhook: ${WEBHOOK_URL.substring(0, 60)}...`);
});
