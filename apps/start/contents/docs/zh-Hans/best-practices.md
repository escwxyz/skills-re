---
title: 最佳实践
description: 编写高效、安全且可移植 Skill 的指南。
category: 参考
order: 4
updatedAt: 2026-05-19
---

## 保持 Skill 专注

一个 Skill 应该把一件事做好。抵制将多种行为打包到一个文件的冲动——用户可以通过安装多个 Skill 来组合使用。专注的 Skill 更易于理解、测试和维护。

**好的做法：** `code-review` — 检查 diff 的正确性和代码风格  
**应避免：** `dev-assistant` — 审查代码、编写测试、更新文档并管理 Issue

## 保持 Skill 正文简洁

代理的上下文窗口有限且昂贵。每一句话都应有价值。避免"你是一个有帮助的助手……"之类的填充语——直接给出指令。

## 提交前先测试

在本地安装 Skill 并通过 CLI 读取内容，验证是否正确：

```bash
skills-re install ./path/to/skill --agent claude
skills-re read my-skill --agent claude
```

然后用代理针对典型输入运行，检查输出是否符合预期。

## 为作品声明许可证

始终在 frontmatter 中设置 `license` 字段。`MIT` 是注册表中最宽松、最常见的许可证。

```yaml
---
name: my-skill
description: 一句话描述。
license: MIT
---
```

## 一个仓库，多个 Skill

如果你维护一套相关 Skill，将它们组织为同一仓库的子目录。每个包含 `SKILL.md` 的子目录在提交时会被独立检测。

## 写清晰的描述

`description` 字段是用户在搜索结果中看到的内容。一句精准的话胜过一段模糊的文字——描述结果，而非机制。

**好的做法：** `审查 git diff 的正确性、代码风格和潜在的回归问题。`  
**应避免：** `一个有帮助的 Skill，协助完成代码审查任务及相关活动。`
