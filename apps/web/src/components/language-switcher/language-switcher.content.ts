import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const languageSwitcherContent = {
  key: "language-switcher",
  content: {
    languages: t({
      en: "Languages",
      de: "Sprachen",
      "zh-Hans": "语言",
    }),
    longLabel: t({
      en: "English",
      de: "Deutsch",
      "zh-Hans": "简体中文",
    }),
    shortLabel: t({
      en: "EN",
      de: "DE",
      "zh-Hans": "简",
    }),
  },
} satisfies Dictionary;

export default languageSwitcherContent;
