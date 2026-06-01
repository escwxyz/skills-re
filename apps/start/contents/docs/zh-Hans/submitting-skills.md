---
title: 提交 Skill
description: 通过向注册表提交 GitHub 仓库，将你的 Skill 分享给社区。
category: 指南
order: 2
updatedAt: 2026-05-19
---

## 概述

提交 Skill 后，其他人可以在注册表中发现它，并通过 `skills-re` 安装。任何人都可以提交，无需账户。Skill 有版本控制，一旦提交便不可更改——每个已提交的版本都是永久快照。

## 第一步 — 创建 SKILL.md

每个 Skill 从一个公开 GitHub 仓库中的 `SKILL.md` 文件开始。必填的 frontmatter 字段如下：

```yaml
---
name: my-skill
description: 一句话描述这个 Skill 的用途。
license: MIT
---
```

在 frontmatter 下方，用普通 Markdown 编写 Skill 正文。这是你的代理收到的系统级指令——请简洁精准。

一个仓库中可以包含多个 Skill，每个 Skill 放在各自的子目录中，并有独立的 `SKILL.md`。

## 第二步 — 通过网站提交

前往 [/submit](/submit)，将你的 GitHub 仓库 URL 粘贴到表单中。注册表会获取该仓库，检测所有 `SKILL.md` 文件，并显示包含验证错误（如有）的预览。

选择你要提交的 Skill，点击 **Submit**。你的 Skill 将在几分钟内上线。

## 版本管理

每次提交都会创建一个新的不可变快照，反映仓库的当前状态。若要提交更新，请在仓库中修改 `SKILL.md` 内容后重新提交——注册表会检测到变更并创建新版本。

## 撤销提交

Skill 一旦提交便无法删除。可以将其标记为已废弃，这会将其从浏览和搜索结果中移除，但已安装的版本仍可正常使用。
