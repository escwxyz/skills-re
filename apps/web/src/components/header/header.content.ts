import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const headerContent = {
  key: "header",
  content: {
    skills: t({ en: "Skills", de: "Skills", "zh-Hans": "Skills" }),
    categories: t({ en: "Categories", de: "Kategorien", "zh-Hans": "类别" }),
    collections: t({ en: "Collections", de: "Sammlungen", "zh-Hans": "合集" }),
    authors: t({ en: "Authors", de: "Autoren", "zh-Hans": "作者" }),
    docs: t({ en: "Docs", de: "Dokumentation", "zh-Hans": "文档" }),
    submit: t({ en: "Submit", de: "Einreichen", "zh-Hans": "提交" }),
  },
} satisfies Dictionary;

export default headerContent;
