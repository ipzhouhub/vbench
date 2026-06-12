# VBench 评测报告 — Seedance × Whaleze AI

> 基于 [VBench](https://github.com/Vchitect/VBench) 框架，对 Seedance + Whaleze AI 文生视频能力进行全维度评估的可视化报告平台。

**在线地址**：[https://vbench.ailiantang.top](https://vbench.ailiantang.top)

---

## 项目概览

```
vbench/
├── index.html              # 主报告（单页应用，纯前端）
├── feedback-server.js      # 反馈 API 服务（Node.js，PM2 托管）
├── README.md               # 本文档
│
├── prompts/                # 测试提示词（按维度分类）
│   ├── selected_prompts.json
│   └── *.txt
├── generated-video/        # 生成的 .mp4 视频
├── video2txt/              # 视频→文字描述（语义评估用）
├── results/                # 评分数据
│   ├── vbench_results.json
│   └── vbench_scores.json
│
├── api/feedback.js         # Vercel Serverless 版本（已弃用）
└── .gitignore
```

## 报告功能

| 页面 | 内容 |
|------|------|
| 评测报告 | 总分卡片、各维度雷达图、评分分布 |
| VBench 介绍 | 评估框架背景与方法论 |
| 测试流程 | 提示词→视频→评分的完整 pipeline |
| 提示词数据 | 中英文对照表格，支持搜索与维度筛选 |
| 视频数据 | 视频预览播放器，按维度分类筛选 |
| 结果数据 | 评分热力图、主/子维度交叉分析 |
| T2V 反馈 | 用户体验反馈表单 → 企业微信群通知 |

## 评估维度

Subject Consistency · Background Consistency · Temporal Flickering · Motion Smoothness · Dynamic Degree · Aesthetic Quality · Imaging Quality · Object Class · Multiple Objects · Human Action · Color · Spatial Relationship · Scene · Appearance Style · Temporal Style · Overall Consistency

## 反馈功能架构

```
浏览器 POST /api/feedback
    ↓
Nginx (vbench.ailiantang.top:443)
    ↓ proxy_pass
Node.js feedback-server.js (127.0.0.1:3890)
    ↓ fetch
企业微信 Webhook → 群消息通知
```

- Webhook key 仅存于服务器环境变量 `QY_WEBHOOK`，源码中不含
- 内置 IP 级限流（60s / 5次）
- 前端提交失败自动重试 3 次，带 10s 超时
- 低评分时自动切换为「最不满意的方面」

## 部署

### 静态文件同步

```bash
rsync -avz --exclude='.git' --exclude='.DS_Store' \
    --exclude='api' ./ sh:/www/wwwroot/vbench.ailiantang.top/
```

### 反馈 API 服务（服务器端）

```bash
# 1. 设置环境变量（写入 ~/.bashrc 持久化）
echo 'export QY_WEBHOOK="你的webhook-key"' >> ~/.bashrc
source ~/.bashrc

# 2. PM2 启动
cd /www/wwwroot/vbench.ailiantang.top
pm2 start feedback-server.js --name vbench-feedback
pm2 save

# 3. Nginx 反向代理（server {} 块内添加）
location /api/ {
    proxy_pass http://127.0.0.1:3890;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
}
nginx -s reload
```

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `QY_WEBHOOK` | 企业微信机器人 Webhook Key | `5c388183-4085-451b-...` |
