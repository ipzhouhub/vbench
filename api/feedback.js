// Vercel Serverless Function - 代理企业微信 Webhook
// webhook key 通过环境变量 QY_WEBHOOK 注入，前端不感知

// 简单内存级限流（单实例 60s 内最多 5 次）
const rateMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
    const now = Date.now();
    const record = rateMap.get(ip) || [];
    const recent = record.filter(t => now - t < RATE_WINDOW);
    if (recent.length >= RATE_LIMIT) return false;
    recent.push(now);
    rateMap.set(ip, recent);
    return true;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // 限流
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }

    // 环境变量检查
    if (!process.env.QY_WEBHOOK) {
        console.error('Missing QY_WEBHOOK env var. Available env keys:', Object.keys(process.env).filter(k => k.includes('WEBHOOK') || k.includes('QY')).join(', ') || 'none');
        return res.status(500).json({ error: '服务端配置错误：缺少 QY_WEBHOOK' });
    }

    const { name, rating, aspect, content } = req.body || {};

    // 参数校验
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: '请选择 1-5 的评分' });
    }
    if (!content || content.trim().length < 2) {
        return res.status(400).json({ error: '反馈内容至少 2 个字符' });
    }
    if (content.length > 2000) {
        return res.status(400).json({ error: '反馈内容不能超过 2000 字' });
    }

    const ratingLabels = { 1: '很差', 2: '一般', 3: '还行', 4: '很好', 5: '超赞' };
    const msg = {
        msgtype: 'markdown',
        markdown: {
            content: [
                '## 🎬 T2V 体验反馈',
                `> **反馈人**: ${name || '匿名'}`,
                `> **体验评分**: ${'⭐'.repeat(rating)} ${ratingLabels[rating] || rating}`,
                `> **满意方面**: ${aspect || '未选择'}`,
                `> **来源 IP**: ${ip}`,
                '',
                `**详细反馈**:\n${content.trim()}`
            ].join('\n')
        }
    };

    const webhookUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.QY_WEBHOOK}`;

    try {
        const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg),
        });
        const data = await resp.json();
        if (data.errcode !== 0) {
            return res.status(502).json({ error: '企业微信接口返回错误', detail: data.errmsg });
        }
        return res.status(200).json({ success: true });
    } catch (e) {
        console.error('Webhook forward error:', e);
        return res.status(500).json({ error: '转发失败', detail: e.message });
    }
}
