# VBench 评测报告 - Seedance + Whaleze AI

基于 [VBench](https://github.com/Vchitect/VBench) 框架，对 Seedance + Whaleze AI 的文生视频（Text-to-Video）能力进行多维度评估。

## 在线访问

- 自有服务器：`https://vbench.ailiantang.top`
- Vercel 镜像：`https://vbench-green.vercel.app`

## 项目结构

```
vbench/
├── index.html              # 主报告页面（单页应用）
├── api/
│   └── feedback.js         # Vercel Serverless Function（企业微信 Webhook 代理）
├── prompts/                # 测试提示词
│   ├── selected_prompts.json   # 精选测试用例（100条）
│   ├── all_prompts.txt         # 完整提示词集
│   └── *.txt                   # 按维度分类的提示词文件
├── generated-video/        # 生成的视频文件（.mp4）
├── video2txt/              # 视频转文字描述（用于语义相似度评估）
├── results/
│   ├── vbench_results.json # VBench 各维度详细评分
│   └── vbench_scores.json  # 逐条提示词的评分结果
├── .env.local              # 本地环境变量（不提交到 Git）
└── .gitignore
```

## 评估维度

VBench 从以下 12 个维度评估视频生成质量：

| 维度 | 说明 |
|------|------|
| Subject Consistency | 主体一致性 |
| Background Consistency | 背景一致性 |
| Temporal Flickering | 时序闪烁 |
| Motion Smoothness | 运动流畅度 |
| Dynamic Degree | 动态程度 |
| Aesthetic Quality | 美学质量 |
| Imaging Quality | 成像质量 |
| Object Class | 物体类别准确度 |
| Multiple Objects | 多物体生成 |
| Human Action | 人类动作 |
| Color | 颜色准确度 |
| Spatial Relationship | 空间关系 |
| Scene | 场景一致性 |
| Appearance Style | 外观风格 |
| Temporal Style | 时序风格 |
| Overall Consistency | 整体一致性 |

## 报告页面功能

- **评测报告**：总分、各维度雷达图、详细评分卡片
- **VBench 介绍**：评估框架说明
- **测试流程**：从提示词到评分的完整流程图
- **提示词数据**：可搜索、可筛选的提示词表格（中英文对照）
- **视频数据**：生成视频预览、按维度筛选
- **结果数据**：评分热力图、子维度交叉分析
- **T2V 反馈**：用户体验反馈表单，通过企业微信 Webhook 提交

## 部署

### 静态文件部署（自有服务器）

```bash
rsync -avz --exclude='.git' --exclude='.DS_Store' ./ sh:/www/wwwroot/vbench.ailiantang.top/
```

### Vercel 部署（Serverless 反馈 API）

1. 将项目推送到 GitHub
2. 在 Vercel 导入项目
3. 设置环境变量 `QY_WEBHOOK`（企业微信 Webhook Key，不带 URL 前缀）
4. Vercel 自动部署，`api/feedback.js` 作为 Serverless Function 运行

## 反馈功能

前端通过 `POST /api/feedback` 提交用户反馈，Vercel Serverless Function 代理转发到企业微信 Webhook，webhook key 仅存在服务端环境变量中。

**环境变量：**

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `QY_WEBHOOK` | 企业微信 Webhook Key | `5c388183-xxxx-xxxx-xxxx` |
