import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const footerContent = {
  key: "footer",
  content: {
    description: t({
      en: "An agent-agnostic registry for distributing procedural knowledge to AI agents. Find, test, equip AI skills, tools and more.",
      "zh-Hans":
        "一个与代理无关的注册表，用于向 AI 代理分发程序性知识。查找、测试、装备 AI 技能、工具等。",
      de: "Eine agentenunabhängige Registry zur Verteilung von Verfahrenswissen an KI-Agenten. KI-Fähigkeiten, Tools und mehr finden, testen und ausrüsten.",
    }),
    platformTitle: t({ en: "The Platform", de: "Die Plattform", "zh-Hans": "平台" }),
    platformIndex: t({ en: "Index", de: "Index", "zh-Hans": "索引" }),
    platformCollections: t({ en: "Collections", de: "Sammlungen", "zh-Hans": "合集" }),
    platformAuthors: t({ en: "Authors", de: "Autoren", "zh-Hans": "作者" }),
    platformSearch: t({ en: "Search", de: "Suche", "zh-Hans": "搜索" }),
    publishTitle: t({ en: "Publish", de: "Veröffentlichen", "zh-Hans": "发布" }),
    publishSubmit: t({ en: "Submit a skill", de: "Skill einreichen", "zh-Hans": "提交技能" }),
    publishChangelog: t({
      en: "Changelog / diffs",
      de: "Changelog / Diffs",
      "zh-Hans": "更新日志 / 差异",
    }),
    publishDocs: t({ en: "Docs — skill.md", de: "Docs — skill.md", "zh-Hans": "文档 — skill.md" }),
    publishSigning: t({ en: "Signing guide", de: "Signierungsanleitung", "zh-Hans": "签名指南" }),
    legalTitle: t({ en: "Legal", de: "Rechtliches", "zh-Hans": "法律" }),
    legalImprint: t({ en: "Imprint", de: "Impressum", "zh-Hans": "版权信息" }),
    legalTerms: t({ en: "Terms of Service", de: "Nutzungsbedingungen", "zh-Hans": "服务条款" }),
    legalPrivacy: t({ en: "Privacy Policy", de: "Datenschutzrichtlinie", "zh-Hans": "隐私政策" }),
    legalCookies: t({ en: "Cookies Policy", de: "Cookie-Richtlinie", "zh-Hans": "Cookie 政策" }),
  },
} satisfies Dictionary;

export default footerContent;
