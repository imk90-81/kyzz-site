---
title: "日报 — 2026.05.25"
description: "日报 2026-05-25"
pubDate: 2026-05-25
tags: [daily]
---

# 🤖 AI Coding 日报 — 2026.05.25（周一）

> 聚焦 AI 编程领域动态，每日筛选 3-5 条高价值信息。

---

## 🔥 今日要点速览

| # | 事件 | 影响等级 |
|---|------|---------|
| 1 | OpenAI 提交保密 IPO 招股书，AI 编码赛道正式进入资本竞速 | ⭐⭐⭐⭐⭐ |
| 2 | Cursor 发布 Composer 2.5，1/10 成本追平 Opus 4.7 编程能力 | ⭐⭐⭐⭐ |
| 3 | DeepSeek V4-Pro 永久降价 75%，组建代码智能体团队对标 Claude Code | ⭐⭐⭐⭐ |
| 4 | Gemini 3.5 Flash 正式 GA，编程基准全面超越上代旗舰 | ⭐⭐⭐⭐ |
| 5 | Karpathy 加入 Anthropic 预训练团队，用 Claude 自身加速研究 | ⭐⭐⭐ |

---

## 1️⃣ OpenAI 提交保密 IPO 招股书，AI 编码赛道正式进入资本竞速

**📅 日期**：5 月 22 日

**事件概要**：

OpenAI 于 5 月 22 日向 SEC 提交保密 IPO 招股书，由高盛和摩根士丹利担任主承销商，上市窗口瞄准 2026 年秋季，目标估值逾 **1 万亿美元**。同时公司进行大规模重组——联合创始人 Greg Brockman 统一接管 ChatGPT、Codex、API 三条产品线，提出建设「统一的 Agent 平台」。

- **Q1 营收** 57 亿美元，但调整后经营利润率 **-122%**（每赚 1 美元亏 1.22 美元）
- ChatGPT 周活 **9.05 亿**，增长已出现放缓迹象
- Mac 版 Codex 新增 **Appshots** 功能，可将桌面窗口画面直接传给 AI

> **为什么值得关注**：OpenAI 作为 Codex / ChatGPT 编码产品的母公司，IPO 标志着 AI 编码工具正式从技术竞赛进入资本市场博弈。Brockman 统一三条产品线的决策暗示 OpenAI 将在编程 Agent 方面加大投入，后续产品整合值得关注。

---

## 2️⃣ Cursor 发布 Composer 2.5，1/10 成本追平 Opus 4.7

**📅 日期**：5 月 18 日

**事件概要**：

AI 编程工具 Cursor 发布自研模型 **Composer 2.5**，底座为月之暗面 **Kimi K2.5**（万亿参数 MoE 架构）。核心指标：

| 基准 | Composer 2.5 | Claude Opus 4.7 | GPT-5.5 |
|------|-------------|-----------------|---------|
| SWE-Bench Multilingual | 79.8% | 80.5% | — |
| CursorBench v3.1 | **63.2%** | 61.6% | — |
| Terminal-Bench 2.0 | 69.3% | 69.4% | **82%+** |

- 定价：输入 **$0.50** / 输出 **$2.50**（每百万 token），**仅为 Opus 4.7 的 1/10**
- 85% 算力投入后训练，合成训练数据量达前代 **25 倍**
- Cursor 3.4 同期更新，新增团队 Agent 环境和编辑器内 PR 审查功能

> **为什么值得关注**：Cursor 选择自研而非继续依赖 Claude，在编程 Agent 核心能力上以极低成本追平顶级模型。配合 3.4 版的团队协作功能，Cursor 正在从个人开发工具转向团队级 AI 编码平台。SpaceX 持有的 600 亿美元收购期权进一步印证了市场预期。

---

## 3️⃣ DeepSeek V4-Pro 永久降价 75%，组建代码 Agent 团队

**📅 日期**：5 月 22 日

**事件概要**：

DeepSeek 宣布 V4-Pro API 临时促销价转为**永久定价**：

| 项目 | 原价 | 永久新价 |
|------|------|---------|
| 输入 | $1.74/百万 token | **$0.435/百万 token** |
| 输出 | $3.48/百万 token | **$0.87/百万 token** |
| 缓存命中 | — | 成本同步降低 **90%** |

- 总参数 **1.6 万亿**，每次推理激活 490 亿，当前最大开放权重模型
- 全部运行在**华为昇腾芯片**上，芯片成本结构差异是降价底气
- 内部已组建 **Harness 团队**，专攻代码智能体产品，对标 Claude Code

> **为什么值得关注**：永久降价 + 组建代码 Agent 专属团队 = DeepSeek 明确将 AI 编程视为战略级方向。极低价格使 V4-Pro 成为高负载编程任务的性价比之王，比 Opus 4.7 便宜 **8-10 倍**。华为昇腾算力栈的成熟度值得关注。

---

## 4️⃣ Gemini 3.5 Flash 正式 GA，编程基准全面超越上代旗舰

**📅 日期**：5 月 25 日（GA 生效）

**事件概要**：

Google I/O 2026 发布的 **Gemini 3.5 Flash** 正式 GA（Generally Available），定价为输入 $1.50 / 输出 $9 每百万 token。

- 编程和 Agent 基准全面超越上代旗舰 **Gemini 3.1 Pro**
- 输出速度为 GPT-5.5 的 **4 倍**
- Terminal-Bench 2.1 得分 **76.2%**
- Gemini Spark 确认将支持 **MCP（Model Context Protocol）** 第三方集成
- Adobe、Canva、CapCut 宣布集成 Gemini

> **为什么值得关注**：Flash 级别模型在编程能力上超越 Pro 级前辈，说明 AI 编程的「够用门槛」正在快速下移。MCP 协议的支持使 Gemini 生态可接入更多开发工具链，对 AI Agent 编程场景意义尤为重大。

---

## 5️⃣ Karpathy 加入 Anthropic 预训练团队

**📅 日期**：5 月 19 日

**事件概要**：

OpenAI 联合创始人 **Andrej Karpathy** 正式加入 Anthropic 预训练团队，将利用 Claude 本身来加速预训练研究。同期 Anthropic 动态：

- Claude Code 快速模式默认模型切到 **Opus 4.7**，代码迭代速度提升 **2.5 倍**
- 企业版推出 **Managed Agents** 自托管沙箱
- 以超 **3 亿美元**收购 SDK 生成工具 **Stainless**，关停其 hosted 产品，切断竞对 SDK 生成服务
- 6 月 15 日起 **Agent SDK 单独计费**，重度用户需重新评估用量

> **为什么值得关注**：Karpathy 的加入是 Anthropic 在编程 AI 领域持续加码的信号。Claude Code 的迭代提速 + Managed Agents 自托管 + Agent SDK 商业化拆分，说明 Anthropic 正在从工具提供者向企业级编程 Agent 基础设施转型。

---

## 📊 本周值得追踪的后续动态

| 事件 | 预计时间 | 关注点 |
|------|---------|--------|
| Gemini 3.5 Pro 发布 | 6 月 | 编程能力是否进一步拉开差距 |
| Qwen 3.7 开源版本（Plus） | 6 月中下旬 | 开源社区能否复现闭源旗舰水平 |
| GPT-5.6 发布 | 预测 6 月 30 日前 | OpenAI IPO 前的关键产品更新 |
| Anthropic Agent SDK 新计费生效 | 6 月 15 日 | 对 Claude Code 重度用户的影响 |
| SpaceX 600 亿美元 Cursor 收购期权进展 | 待定 | AI 编程赛道最大并购案走向 |

---

*数据来源：CNBC、WSJ、36Kr、aitoolsrecap.com、codersera.com、新浪财经*
*报告生成时间：2026 年 5 月 25 日 22:18 CST*
