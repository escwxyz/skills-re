---
question: 支持哪些许可证？
order: 7
---

`license` frontmatter 字段接受任何 SPDX 认可的许可证标识符。注册表中最常见的选项包括：

- **MIT** — 具有宽松许可，允许商业使用和再分发
- **Apache-2.0** — 具有专利授权的宽松许可
- **CC-BY-4.0** — 署名型 Creative Commons 许可
- **Proprietary** — 所有权利保留（使用 `Proprietary` 作为值）

你也可以使用 `UNLICENSED` 来明确保留所有权利，而不声明正式的开放许可证。

注册表不会在消费者端强制执行许可证合规性——在安装任何 Skill 前检查其许可证是你的责任。标记为 `Proprietary` 的 Skill 会在注册表中显著显示。
