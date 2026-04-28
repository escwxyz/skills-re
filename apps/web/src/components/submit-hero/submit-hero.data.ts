import type { LocalesValues } from "intlayer";

export interface SubmitHeroContent {
  eyebrow: string;
  title: string;
  description: string;
}

export const submitHeroContent: Record<LocalesValues, SubmitHeroContent> = {
  en: {
    eyebrow: "§ For Authors",
    title: "Publish a skill.",
    description:
      "A skill is a folder. It holds a skill.md, optional scaffolding, and an evals file. Sign it, describe it, and hand it to the index. No build step. No manifest gymnastics.",
  },
  de: {
    eyebrow: "§ Für Autoren",
    title: "Veröffentliche ein Skill.",
    description:
      "Ein Skill ist ein Ordner. Er enthält eine skill.md, optionales Scaffolding und eine Evals-Datei. Signiere ihn, beschreibe ihn und gib ihn an den Index weiter. Kein Build-Schritt. Keine Manifest-Akrobatik.",
  },
  "zh-Hans": {
    eyebrow: "§ 面向作者",
    title: "发布一个 skill。",
    description:
      "Skill 是一个文件夹。它包含 skill.md、可选脚手架和一个 evals 文件。为它签名、描述它，并交给索引。没有构建步骤，也不需要清单折腾。",
  },
};

export function getSubmitHeroContent(
  locale: string,
  fallbackLocale: LocalesValues = "en",
): SubmitHeroContent {
  return (
    submitHeroContent[locale as LocalesValues] ??
    submitHeroContent[fallbackLocale] ??
    submitHeroContent.en
  );
}
