---
question: Which AI agents are supported?
order: 3
---

Skills are designed to be agent-agnostic — any agent that can read a text file and follow markdown-formatted instructions can use them. The registry currently lists tested compatibility for:

- **Claude Code** (Anthropic CLI)
- **Claude API** (direct API usage)
- **Codex** (OpenAI)
- **Cursor**
- **GitHub Copilot** (Workspace mode)
- **Google Gemini** (via Vertex AI agents)
- **Kiro** (AWS)
- **OpenCode**

The `compatibility` field in each skill's frontmatter tells you which runtimes the author has tested. Skills may work on unlisted runtimes but behaviour is not guaranteed.
