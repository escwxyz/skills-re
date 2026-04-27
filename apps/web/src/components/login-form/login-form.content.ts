import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const loginFormContent = {
  key: "login-form",
  content: {
    invalidEmail: t({ en: "Invalid email", de: "Ungültige E-Mail", "zh-Hans": "无效的电子邮件" }),
    email: t({ en: "Email", de: "E-Mail", "zh-Hans": "电子邮件" }),
    yourEmail: t({ en: "YOUR EMAIL", de: "IHRE E-MAIL-ADRESSE", "zh-Hans": "您的电子邮件" }),
    password: t({ en: "Password", de: "Passwort", "zh-Hans": "密码" }),
    signIn: t({ en: "Sign In", de: "Anmelden", "zh-Hans": "登录" }),
    signingIn: t({ en: "Signing in...", de: "Anmeldung läuft...", "zh-Hans": "正在登录……" }),
  },
} satisfies Dictionary;

export default loginFormContent;
