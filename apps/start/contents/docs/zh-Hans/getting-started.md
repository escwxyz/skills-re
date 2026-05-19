---
title: 快速入门
description: 安装你的第一个 Skill，几分钟内即可上手。
category: 介绍
order: 1
updatedAt: 2026-05-19
---

## 安装 CLI

```bash
npm install -g @skills-re/cli
```

## 登录

使用你的 skills.re 账户通过设备流程登录：

```bash
skills-re auth login
```

检查登录状态或退出登录：

```bash
skills-re auth status
skills-re auth logout
```

安装公共 Skill 无需登录。

## 查找 Skill

按关键词、标签或分类搜索注册表：

```bash
skills-re search code review
skills-re search --tag testing
skills-re search --category security --limit 5
```

每条结果显示 Skill 的标题、slug、描述和来源路径（`author/repo/slug`）。**slug** 是安装时传入的标识符。

查看特定 Skill 的详情：

```bash
# 按 slug 查找
skills-re show code-review

# 按搜索结果中显示的完整注册表路径查找
skills-re show anthropic-labs/my-repo/code-review
```

## 安装 Skill

将 Skill 的 slug 传给 `install`，并通过 `--agent` 指定代理：

```bash
# Claude Code  →  .claude/skills/code-review/
skills-re install code-review --agent claude

# Codex        →  .codex/skills/code-review/（省略 --agent 时的默认值）
skills-re install code-review --agent codex

# Cursor       →  .cursor/skills/code-review/
skills-re install code-review --agent cursor

# Windsurf     →  .windsurf/skills/code-review/
skills-re install code-review --agent windsurf

# Aider        →  .aider/skills/code-review/
skills-re install code-review --agent aider
```

用 `@version` 指定特定版本：

```bash
skills-re install code-review@2.4.1 --agent claude
```

直接从 GitHub 仓库安装：

```bash
# 使用完整 GitHub URL
skills-re install https://github.com/owner/repo --agent claude

# 使用 owner/repo 简写
skills-re install owner/repo --git --agent claude
```

GitHub 安装需要 `git` 在 `PATH` 中可用。

## 在代理中激活 Skill

安装后，运行 `sync` 将已安装的 Skill 写入代理的元数据文件，代理通过该文件发现可用的 Skill：

```bash
skills-re sync --agent claude    # 写入 CLAUDE.md
skills-re sync --agent codex     # 写入 AGENTS.md
skills-re sync --agent cursor    # 写入 .cursor/rules/skills-re.mdc
skills-re sync --agent windsurf  # 写入 AGENTS.md
skills-re sync --agent aider     # 写入 AGENTS.md
```

每次安装或更新 Skill 后都需重新运行 `sync`。

## 更新 Skill

```bash
# 将所有已安装的 Skill 更新到最新版本
skills-re update --agent claude

# 更新单个 Skill
skills-re update code-review --agent claude
```

## 列出已安装的 Skill

查看锁文件（`skills-lock.json`）中记录的所有内容：

```bash
skills-re list
skills-re list --json
```

## 读取 Skill 内容

输出已安装 Skill 的原始内容：

```bash
skills-re read code-review --agent claude
```

## 后续步骤

- 阅读[发布 Skill](/docs/submitting-skills)
- 在[注册表](/skills)中探索社区 Skill
- 查看[最佳实践](/docs/best-practices)
