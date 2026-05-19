---
question: What are Agent Skills?
order: 1
---

Agent Skills are a lightweight open format for extending AI agents with specialized knowledge, workflows, and guardrails. A skill lives in a folder and includes a `SKILL.md` file with metadata (at minimum `name` and `description`) plus the instructions an agent should follow. Skills may also bundle scripts, templates, examples, or other supporting files.

Rather than being a loose prompt library, skills follow a defined [specification](https://agentskills.io/specification) and are designed to be portable. Any agent that can read a text file and execute markdown-formatted instructions can use them.

The **Agent Skill Registry** (skills.re) is the central hub for discovering, sharing, and distributing skills. Skills listed in the registry are versioned and evaluated against a standard test suite before publication, so you can trust that a skill behaves as described when you install it.
