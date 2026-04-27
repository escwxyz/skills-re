import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const emailOtpFormContent = {
  key: "email-otp-form",
  content: {
    pleaseEnterAValidEmail: t({
      en: "Please enter a valid email.",
      de: "Bitte geben Sie eine gültige E-Mail ein.",
      "zh-Hans": "请输入有效的电子邮件地址。",
    }),
    sendAVerificationCodeFirst: t({
      en: "Send a verification code first.",
      de: "Senden Sie zuerst einen Bestätigungscode.",
      "zh-Hans": "请先发送验证码。",
    }),
    enterThe6DigitCode: t({
      en: "Enter the 6-digit verification code.",
      de: "Geben Sie den 6-stelligen Bestätigungscode ein.",
      "zh-Hans": "请输入6位数的验证码。",
    }),
    invalidOrExpiredCode: t({
      en: "Invalid or expired code. Please try again.",
      de: "Ungültiger oder abgelaufener Code. Bitte versuchen Sie es erneut.",
      "zh-Hans": "验证码无效或已过期，请重试。",
    }),
    couldNotSendCode: t({
      en: "Could not send code. Please try again.",
      de: "Code konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
      "zh-Hans": "验证码发送失败，请重试。",
    }),
    verificationCodeSent: t({
      en: "Verification code sent. Check your inbox.",
      de: "Bestätigungscode gesendet. Prüfen Sie Ihren Posteingang.",
      "zh-Hans": "验证码已发送，请查收。",
    }),
    emailAddress: t({
      en: "Email address",
      de: "E-Mail-Adresse",
      "zh-Hans": "电子邮件",
    }),
    emailPlaceholder: t({
      en: "you@company.com",
      de: "you@company.com",
      "zh-Hans": "you@company.com",
    }),
    verificationCode: t({
      en: "Verification code",
      de: "Bestätigungscode",
      "zh-Hans": "验证码",
    }),
    sendVerificationCode: t({
      en: "Send verification code",
      de: "Bestätigungscode senden",
      "zh-Hans": "发送验证码",
    }),
    resendVerificationCode: t({
      en: "Resend verification code",
      de: "Bestätigungscode erneut senden",
      "zh-Hans": "重新发送验证码",
    }),
    resendCode: t({ en: "Resend code", de: "Code erneut senden", "zh-Hans": "重新发送代码" }),
    sending: t({ en: "Sending...", de: "Wird gesendet...", "zh-Hans": "正在发送..." }),
    verifyAndContinue: t({
      en: "Verify and continue",
      de: "Verifizieren und fortfahren",
      "zh-Hans": "验证并继续",
    }),
    verifying: t({ en: "Verifying...", de: "Wird geprüft...", "zh-Hans": "验证中..." }),
    backToSignInOptions: t({
      en: "Back to sign in options",
      de: "Zurück zu den Anmeldeoptionen",
      "zh-Hans": "返回登录选项",
    }),
  },
} satisfies Dictionary;

export default emailOtpFormContent;
