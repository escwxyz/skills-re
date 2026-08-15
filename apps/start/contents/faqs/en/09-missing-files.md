---
question: Why are files from my skill missing from the download?
order: 9
---

Skills.re intentionally excludes files inside any directory named `dist` when importing a skill from GitHub. This applies even when those files are committed to the repository, so they will not appear in the published download archive.

Do not place required runtime files, scripts, or other essential assets under `dist`. Move them to a source-controlled directory such as `scripts`, `assets`, or `runtime`, and update your skill to reference that location. Treat `dist` as rebuildable output that users should not need in order to run the skill.
