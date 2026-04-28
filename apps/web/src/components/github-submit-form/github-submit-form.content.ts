import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const githubSubmitFormContent = {
  key: "github-submit-form",
  content: {
    pageTitle: t({
      en: "GitHub Import",
      de: "GitHub-Import",
      "zh-Hans": "GitHub 导入",
    }),
    pageDescription: t({
      en: "Point the registry at a public GitHub repository. The system previews publishable skills, flags invalid entries, and lets you choose which ones to queue for processing.",
      de: "Richte das Register auf ein öffentliches GitHub-Repository. Das System zeigt veröffentlichbare Skills in der Vorschau an, markiert ungültige Einträge und lässt dich auswählen, welche zur Verarbeitung eingereiht werden.",
      "zh-Hans":
        "将注册表指向一个公开的 GitHub 仓库。系统会预览可发布的技能，标记无效条目，并让你选择哪些条目排队处理。",
    }),
    inputLabel: t({
      en: "Repository URL",
      de: "Repository-URL",
      "zh-Hans": "仓库地址",
    }),
    inputPlaceholder: t({
      en: "https://github.com/username/repo",
      de: "https://github.com/benutzername/repo",
      "zh-Hans": "https://github.com/username/repo",
    }),
    inputHelp: t({
      en: "Supports github.com/org/repo and github.com/org/repo/tree/branch/path URLs.",
      de: "Unterstützt github.com/org/repo- und github.com/org/repo/tree/branch/path-URLs.",
      "zh-Hans":
        "支持 github.com/org/repo 以及 github.com/org/repo/tree/branch/path 形式的地址。",
    }),
    inputFetch: t({
      en: "Fetch →",
      de: "Abrufen →",
      "zh-Hans": "获取 →",
    }),
    inputFetching: t({
      en: "Fetching…",
      de: "Wird abgerufen…",
      "zh-Hans": "正在获取…",
    }),
    logsInvalidUrlError: t({
      en: "Could not parse repository URL.",
      de: "Die Repository-URL konnte nicht verarbeitet werden.",
      "zh-Hans": "无法解析仓库地址。",
    }),
    logsValidatingUrl: t({
      en: "Validating GitHub URL...",
      de: "GitHub-URL wird geprüft...",
      "zh-Hans": "正在验证 GitHub 地址…",
    }),
    logsNormalizedUrl: t({
      en: "Normalized URL: {githubUrl}",
      de: "Normalisierte URL: {githubUrl}",
      "zh-Hans": "规范化后的地址：{githubUrl}",
    }),
    logsFetchingMetadata: t({
      en: "Fetching repository metadata...",
      de: "Repository-Metadaten werden abgerufen...",
      "zh-Hans": "正在获取仓库元数据…",
    }),
    logsRepositorySummary: t({
      en: "{owner}/{repo} @ {branch}",
      de: "{owner}/{repo} @ {branch}",
      "zh-Hans": "{owner}/{repo} @ {branch}",
    }),
    logsFoundPublishableSkills: t({
      en: "Found {count} publishable skill(s) inside {folder} folder",
      de: "{count} veröffentlichbare(s) Skill(s) im Ordner {folder} gefunden",
      "zh-Hans": "在 {folder} 文件夹中找到 {count} 个可发布技能",
    }),
    logsSkippedInvalidSkills: t({
      en: "Skipped {count} invalid skill(s).",
      de: "{count} ungültige(s) Skill(s) übersprungen.",
      "zh-Hans": "已跳过 {count} 个无效技能。",
    }),
    logsNoInvalidSkillsSkipped: t({
      en: "No invalid skills were skipped.",
      de: "Es wurden keine ungültigen Skills übersprungen.",
      "zh-Hans": "没有跳过任何无效技能。",
    }),
    logsReviewAndChoose: t({
      en: "Review the list below and choose which skills to publish.",
      de: "Überprüfe die Liste unten und wähle aus, welche Skills veröffentlicht werden sollen.",
      "zh-Hans": "请查看下面的列表，并选择要发布的技能。",
    }),
    logsNoPublishableSkills: t({
      en: "No publishable skills were found in this repository.",
      de: "In diesem Repository wurden keine veröffentlichbaren Skills gefunden.",
      "zh-Hans": "该仓库中未找到可发布的技能。",
    }),
    logsFailedToFetchPreview: t({
      en: "Failed to fetch repository preview from the live API.",
      de: "Die Repository-Vorschau konnte nicht aus der Live-API geladen werden.",
      "zh-Hans": "无法从线上 API 获取仓库预览。",
    }),
    logsSubmittingSelected: t({
      en: "Submitting {count} selected skill(s) for processing...",
      de: "Es werden {count} ausgewählte(s) Skill(s) zur Verarbeitung eingereicht...",
      "zh-Hans": "正在提交 {count} 个已选技能进行处理…",
    }),
    logsJobQueued: t({
      en: "Job queued.",
      de: "Auftrag in die Warteschlange gestellt.",
      "zh-Hans": "任务已排队。",
    }),
    logsJobQueuedWithId: t({
      en: "Job queued: {workflowId}",
      de: "Auftrag in die Warteschlange gestellt: {workflowId}",
      "zh-Hans": "任务已排队：{workflowId}",
    }),
    logsSubmittedSkills: t({
      en: "Submitted {count} skill(s).",
      de: "{count} Skill(s) eingereicht.",
      "zh-Hans": "已提交 {count} 个技能。",
    }),
    logsSkillsBeingProcessed: t({
      en: "Skills are being processed in the background.",
      de: "Die Skills werden im Hintergrund verarbeitet.",
      "zh-Hans": "技能正在后台处理中。",
    }),
    logsSubmissionSkipped: t({
      en: "Submission skipped (reason: {reason}).",
      de: "Einreichung übersprungen (Grund: {reason}).",
      "zh-Hans": "提交已跳过（原因：{reason}）。",
    }),
    logsSubmissionFailed: t({
      en: "Submission failed.",
      de: "Einreichung fehlgeschlagen.",
      "zh-Hans": "提交失败。",
    }),
    logsLiveApiRequestFailed: t({
      en: "The live API request did not complete successfully.",
      de: "Die Anfrage an die Live-API wurde nicht erfolgreich abgeschlossen.",
      "zh-Hans": "线上 API 请求未能成功完成。",
    }),
    logsErrorPrefix: t({
      en: "Error:",
      de: "Fehler:",
      "zh-Hans": "错误：",
    }),
    statusFetchIdle: t({ en: "Idle", de: "Inaktiv", "zh-Hans": "空闲" }),
    statusFetchFetching: t({ en: "Fetching…", de: "Wird abgerufen…", "zh-Hans": "正在获取…" }),
    statusFetchFetched: t({ en: "Ready", de: "Bereit", "zh-Hans": "已就绪" }),
    statusFetchError: t({ en: "Failed", de: "Fehlgeschlagen", "zh-Hans": "失败" }),
    statusSubmitIdle: t({ en: "Idle", de: "Inaktiv", "zh-Hans": "空闲" }),
    statusSubmitSubmitting: t({
      en: "Submitting…",
      de: "Wird eingereicht…",
      "zh-Hans": "正在提交…",
    }),
    statusSubmitSubmitted: t({ en: "Queued", de: "Eingeplant", "zh-Hans": "已排队" }),
    statusSubmitError: t({ en: "Failed", de: "Fehlgeschlagen", "zh-Hans": "失败" }),
    previewTitle: t({
      en: "Repository Preview",
      de: "Repository-Vorschau",
      "zh-Hans": "仓库预览",
    }),
    previewBranch: t({
      en: "Branch:",
      de: "Branch:",
      "zh-Hans": "分支：",
    }),
    previewPublishableSkills: t({
      en: "Publishable skills:",
      de: "Veröffentlichbare Skills:",
      "zh-Hans": "可发布技能：",
    }),
    previewSkippedInvalidSkills: t({
      en: "Skipped invalid skills:",
      de: "Übersprungene ungültige Skills:",
      "zh-Hans": "已跳过的无效技能：",
    }),
    previewSelectSkillsToPublish: t({
      en: "Select skills to publish",
      de: "Skills zum Veröffentlichen auswählen",
      "zh-Hans": "选择要发布的技能",
    }),
    previewSelectAll: t({ en: "Select all", de: "Alle auswählen", "zh-Hans": "全选" }),
    previewClear: t({ en: "Clear", de: "Leeren", "zh-Hans": "清空" }),
    previewInvalidSkillsTitle: t({
      en: "Skipped Invalid Skills",
      de: "Übersprungene ungültige Skills",
      "zh-Hans": "已跳过的无效技能",
    }),
    previewSkillRootPathFallback: t({ en: "skills", de: "skills", "zh-Hans": "skills" }),
    previewUntitledSkill: t({
      en: "Untitled SKILL.md",
      de: "Unbenanntes SKILL.md",
      "zh-Hans": "未命名的 SKILL.md",
    }),
    previewNoPreviewYet: t({
      en: "Fetch a repository to continue.",
      de: "Rufe zuerst ein Repository ab, um fortzufahren.",
      "zh-Hans": "先获取一个仓库以继续。",
    }),
    railFetch: t({ en: "Fetch", de: "Abrufen", "zh-Hans": "获取" }),
    railSubmit: t({ en: "Submit", de: "Einreichen", "zh-Hans": "提交" }),
    footerSelectedSummary: t({
      en: "{selected} of {total} publishable skill(s) selected",
      de: "{selected} von {total} veröffentlichbare(n) Skill(s) ausgewählt",
      "zh-Hans": "已选择 {selected}/{total} 个可发布技能",
    }),
    footerSubmit: t({ en: "Submit →", de: "Einreichen →", "zh-Hans": "提交 →" }),
    footerSubmitting: t({ en: "Submitting…", de: "Wird eingereicht…", "zh-Hans": "正在提交…" }),
    footerQueued: t({ en: "Queued ✓", de: "Eingeplant ✓", "zh-Hans": "已排队 ✓" }),
  },
} satisfies Dictionary;

export default githubSubmitFormContent;
