import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const mobileMenuContent = {
  key: "mobile-menu",
  content: {
    title: t({ en: "Menu", de: "Menü", "zh-Hans": "菜单" }),
    close: t({ en: "Close", de: "Schließen", "zh-Hans": "关闭" }),
    description: t({
      en: "Navigate to key sections of the site",
      de: "Zu den wichtigsten Abschnitten der Website navigieren",
      "zh-Hans": "导航到网站的主要部分",
    }),
    skills: t({ en: "Skills", de: "Skills", "zh-Hans": "Skills" }),
    collections: t({ en: "Collections", de: "Sammlungen", "zh-Hans": "合集" }),
    authors: t({ en: "Authors", de: "Autoren", "zh-Hans": "作者" }),
    search: t({ en: "Search", de: "Suche", "zh-Hans": "搜索" }),
  },
} satisfies Dictionary;

export default mobileMenuContent;
