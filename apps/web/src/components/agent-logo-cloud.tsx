"use client";

import {
  ClaudeCode,
  Cursor,
  OpenClaw,
  Gemini,
  Windsurf,
  Antigravity,
  Codex,
  OpenCode,
  Cline,
  Amp,
  HermesAgent,
  Trae,
  GithubCopilot,
  Goose,
  KiloCode,
  RooCode,
} from "@lobehub/icons";
import { motion } from "motion/react";
import type { Variants } from "motion/react";

const AGENTS = [
  { Icon: ClaudeCode, label: "Claude Code", href: "https://claude.ai/code" },
  { Icon: Codex, label: "Codex", href: "https://openai.com/codex" },
  { Icon: Gemini, label: "Gemini CLI", href: "https://geminicli.com" },
  { Icon: OpenCode, label: "OpenCode", href: "https://opencode.ai" },

  { Icon: Cursor, label: "Cursor", href: "https://www.cursor.com" },
  { Icon: Windsurf, label: "Windsurf", href: "https://windsurf.com" },
  { Icon: GithubCopilot, label: "GitHub Copilot", href: "https://github.com/features/copilot" },
  { Icon: Cline, label: "Cline", href: "https://cline.bot" },
  { Icon: Antigravity, label: "Antigravity", href: "https://antigravity.google" },
  { Icon: Amp, label: "Amp Code", href: "https://ampcode.com" },
  { Icon: Trae, label: "Trae", href: "https://trae.ai" },
  {
    Icon: Goose,
    label: "Goose",
    href: "https://goose-docs.ai",
  },
  {
    Icon: RooCode,
    label: "Roo Code",
    href: "https://roocode.com",
  },
  { Icon: KiloCode, label: "Kilo Code", href: "https://kilo.ai" },

  { Icon: OpenClaw, label: "OpenClaw", href: "https://openclaw.ai" },
  { Icon: HermesAgent, label: "Hermes Agent", href: "https://hermes-agent.nousresearch.com" },
] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 5 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export const AgentLogoCloud = () => (
  <div className="pt-4 border-t">
    <div className="mb-2.5 font-mono text-[9.5px] tracking-[.18em] uppercase text-muted-foreground/50">
      Works with
    </div>
    <motion.div
      className="flex flex-wrap gap-x-6 md:gap-x-8 gap-y-4.5"
      initial="hidden"
      variants={container}
      viewport={{ margin: "-40px", once: true }}
      whileInView="show"
    >
      {AGENTS.map(({ Icon, label, href }) => (
        <motion.a
          key={label}
          className="opacity-20 transition-opacity duration-200 hover:opacity-80"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
          title={label}
          variants={item}
        >
          <Icon size={32} color="var(--muted-foreground)" />
        </motion.a>
      ))}
    </motion.div>
  </div>
);
