export const SITE_NAME = "skills.re";
export const SITE_TAGLINE = "The registry for AI agent skills.";
export const SITE_DESCRIPTION =
  "Discover, install, and publish skills for AI agents. A curated registry of versioned, audited skills for Claude and compatible runtimes.";
export const SITE_KEYWORDS = [
  "ai skills",
  "agent skills",
  "claude skills",
  "ai registry",
  "llm skills",
  "skill registry",
  "ai tools",
];

import { PUBLIC_SITE_URL } from "astro:env/server";

export const SITE_URL = PUBLIC_SITE_URL;

export const OG_IMAGE_DEFAULT = "/og.png";
