---
question: 为什么下载的 Skill 中缺少一些文件？
order: 9
---

从 GitHub 导入 Skill 时，Skills.re 会有意排除所有位于名为 `dist` 的目录中的文件。即使这些文件已经提交到仓库，它们也不会出现在发布的下载归档中。

请勿将必需的运行时文件、脚本或其他关键资源放在 `dist` 目录下。请将它们移到受版本控制的目录中，例如 `scripts`、`assets` 或 `runtime`，并更新 Skill 中的引用。`dist` 应仅用于可重新生成的构建产物；用户不应依赖其中的文件来运行 Skill。
