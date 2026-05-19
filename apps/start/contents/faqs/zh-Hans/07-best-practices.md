---
question: 如何编写高效的 Skill？
order: 3
---

最重要的原则是专注——一个把一件事做好做精的 Skill，比试图覆盖所有内容的 Skill 更有用。

关键指南：

- **写一个精准的描述** — 描述是用户在搜索结果中看到的内容。用一句话准确说明 Skill 的作用。
- **严格限定指令范围** — 告诉代理该做什么，而不是该怎么想。避免“尽量帮忙”这样的模糊指令。
- **声明 `allowed-tools`** — 列出 Skill 所需工具可帮助代理正确执行权限控制。
- **准确使用 `compatibility`** — 只列出你实际测试过的代理。
- **发布前测试** — 在目标代理上运行 Skill，确认其表现与描述一致。

[Best Practices guide](https://agentskills.io/skill-creation/best-practices) 详细介绍了指令设计、资源打包和多步骤工作流结构。
