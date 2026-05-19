---
question: 如何使用 CLI 安装和管理 Skills？
order: 4
---

全局安装 CLI：

```bash
npm install -g @skills-re/cli
```

**搜索并安装** 注册表中的 Skill，按 slug 定位，并使用 `--agent` 指定代理：

```bash
skills-re search code review

skills-re install code-review --agent claude    # → .claude/skills/code-review/
skills-re install code-review --agent cursor    # → .cursor/skills/code-review/
skills-re install code-review --agent codex     # → .codex/skills/code-review/
```

使用 `@version` 固定特定版本：

```bash
skills-re install code-review@2.4.1 --agent claude
```

直接从 GitHub 仓库安装，无需注册表：

```bash
skills-re install owner/repo --git --agent claude
```

**激活** 安装的 Skills，将它们同步到代理的元数据文件：

```bash
skills-re sync --agent claude     # writes to CLAUDE.md
skills-re sync --agent cursor     # writes to .cursor/rules/skills-re.mdc
```

在安装或更新 Skill 后重新运行 `sync`。

**更新并列出** 已安装的 Skills：

```bash
skills-re update --agent claude
skills-re update code-review --agent claude
skills-re list
```

完整 CLI 参考以及 MCP 服务器模式请参阅 [Getting Started guide](/docs/getting-started)。
