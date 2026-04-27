import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const skillPageTocContent = {
  key: "skill-page-toc",
  content: {
    header: t({
      en: "Contents",
      de: "Inhalte",
      "zh-Hans": "内容目录",
    }),
  },
} satisfies Dictionary;

export default skillPageTocContent;
