import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const cookieConsentContent = {
  key: "cookie-consent",
  content: {
    cookie: t({
      en: "Cookie",
      de: "Cookie",
      "zh-Hans": "Cookie",
    }),
    preferences: t({
      en: "Cookie preferences",
      de: "Cookie preferences",
      "zh-Hans": "Cookie 偏好配置",
    }),
    description: t({
      en: "We use a session cookie for sign-in and first-party preference cookies for locale and theme. There are no third-party analytics or ad cookies on this site.",
      de: "TODO",
      "zh-Hans": "TODO",
    }),
  },
} satisfies Dictionary;

export default cookieConsentContent;
