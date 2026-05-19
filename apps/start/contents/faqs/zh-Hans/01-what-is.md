---
question: 什么是 Agent Skills？
order: 1
---

Agent Skills 是一种轻量级、开放的格式，用于通过专业知识、工作流和约束来扩展 AI 代理。一个 Skill 存放在一个文件夹中，包含一个 `SKILL.md` 文件，其中包含元数据（至少 `name` 和 `description`）以及代理应遵循的指令。Skills 还可以打包脚本、模板、示例或其他辅助文件。

与松散的提示词库不同，Skills 遵循定义良好的[规范](https://agentskills.io/specification)，并且设计为可移植。任何能够读取文本文件并执行 markdown 格式指令的代理都可以使用它们。

**Agent Skill Registry**（skills.re）是发现、分享和分发 Skills 的中心入口。注册表中的 Skills 会进行版本控制，并在发布前通过标准测试套件评估，因此你安装时可以更放心它们按描述工作。
