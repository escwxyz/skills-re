---
question: Skills 使用什么格式？
order: 2
---

Skill 是一个包含 `SKILL.md` 文件的文件夹。该文件包含两个部分：

**Frontmatter** — 文件顶部的 YAML 元数据：

```yaml
---
name: my-skill
description: A one-line summary.
license: MIT
compatibility: claude-code, claude-api
version: 1.0.0
metadata:
  stage: stable
allowed-tools: Bash Read
---
```

**正文** — 包含代理应遵循指令的普通 Markdown。没有特殊语法——像编写 Agent 系统提示一样编写，使用标题、列表和清晰的逐步说明。

完整格式参考请见 [Skill Specification](https://agentskills.io/specification)。有关编写高效 Skill 的指导，请参阅 [Best Practices guide](https://agentskills.io/skill-creation/best-practices)。
