import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const socialAuthButtonsContent = {
  key: "social-auth-buttons",
  content: {
    continueWithGithub: t({
      en: "Continue with GitHub",
      de: "Weiter mit GitHub",
      "zh-Hans": "继续使用 GitHub",
    }),
    continueWithGoogle: t({
      en: "Continue with Google",
      de: "Mit Google fortfahren",
      "zh-Hans": "继续使用 Google",
    }),
    continueWithEmail: t({
      en: "Continue with Email",
      de: "Weiter mit E-Mail",
      "zh-Hans": "继续通过电子邮件",
    }),
    or: t({ en: "or", de: "oder", "zh-Hans": "或者" }),
    google: t({ en: "Google", de: "Google", "zh-Hans": "谷歌" }),
    github: t({ en: "GitHub", de: "GitHub", "zh-Hans": "GitHub" }),
  },
} satisfies Dictionary;

export default socialAuthButtonsContent;
