import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const submitSkillTabsContent = {
  key: "submit-skill-tabs",
  content: {
    githubTitle: t({
      en: "GitHub Import",
      de: "GitHub-Import",
      "zh-Hans": "GitHub 导入",
    }),
    githubSubtitle: t({
      en: "Via repository URL",
      de: "Über Repository-URL",
      "zh-Hans": "通过仓库地址",
    }),
    manualTitle: t({
      en: "Manual Submit",
      de: "Manuelle Einreichung",
      "zh-Hans": "手动提交",
    }),
    manualSubtitle: t({
      en: "Coming soon",
      de: "Demnächst verfügbar",
      "zh-Hans": "即将推出",
    }),
  },
} satisfies Dictionary;

export default submitSkillTabsContent;
