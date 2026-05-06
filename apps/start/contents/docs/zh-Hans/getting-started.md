---
title: 快速入门
description: 安装你的第一个 Skill，几分钟内即可上手。
category: 介绍
order: 1
updatedAt: 2025-01-01
---

## 前提条件

确保已安装受支持的 AI 代理运行时：

- **Claude Code** — Anthropic 的 CLI 代理（`claude` 命令）
- **Codex** — OpenAI 的代理运行时
- **Cursor** / **GitHub Copilot** — IDE 集成代理

## 安装 Skill

Skill 是纯 Markdown 文件。下载 `SKILL.md` 文件并放置到项目中：

```bash
curl -sL https://skills.re/s/code-review/SKILL.md -o .claude/skills/code-review.md
```

或使用 `skill.sh` 安装脚本一键安装：

```bash
curl -sL https://skill.sh | sh -s -- code-review
```

## 后续步骤

- 阅读[发布 Skill](/docs/publishing-skills)
- 在[注册表](/skills)中探索社区 Skill
- 查看[最佳实践](/docs/best-practices)
