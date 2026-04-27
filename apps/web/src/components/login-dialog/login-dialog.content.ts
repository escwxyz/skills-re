import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const loginDialogContent = {
  key: "login-dialog",
  content: {
    bySigningInYouAgreeToOur: t({
      en: "By signing in, you agree to our",
      de: "Mit Ihrer Anmeldung stimmen Sie unseren Nutzungsbedingungen zu.",
      "zh-Hans": "登录即表示您同意我们的条款",
    }),
    terms: t({ en: "Terms", de: "Bedingungen", "zh-Hans": "条款" }),
    and: t({ en: "and", de: "Und", "zh-Hans": "和" }),
    privacyPolicy: t({
      en: "Privacy Policy",
      de: "Datenschutzrichtlinie",
      "zh-Hans": "隐私政策",
    }),
    signIn: t({ en: "Sign In", de: "Anmelden", "zh-Hans": "登录" }),
    signInToContinue: t({
      en: "Sign in to continue",
      de: "Melden Sie sich an, um fortzufahren.",
      "zh-Hans": "登录以继续",
    }),
    continueWithGithubToVerify: t({
      en: "Continue with GitHub to verify your identity.",
      de: "Fahren Sie mit GitHub fort, um Ihre Identität zu verifizieren.",
      "zh-Hans": "请继续通过 GitHub 验证您的身份。",
    }),
    chooseAProvider: t({
      en: "Choose a provider or get a one-time code by email.",
      de: "Wählen Sie einen Anbieter oder erhalten Sie einen Einmalcode per E-Mail.",
      "zh-Hans": "选择服务提供商或通过电子邮件获取一次性代码。",
    }),
  },
} satisfies Dictionary;

export default loginDialogContent;
