import { fromAsyncCodeToHtml } from "@shikijs/markdown-it/async";
import { createMarkdownItAsync } from "markdown-it-async";
import type { LanguageInput, SpecialLanguage } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export type ResolvedTheme = "dark" | "light";

// Change themes to match current color schema
const SHIKI_THEME = {
  dark: "github-dark",
  light: "github-light",
} as const satisfies Record<ResolvedTheme, string>;

const languageAliases: Record<string, string> = {
  bash: "shellscript",
  cjs: "javascript",
  js: "javascript",
  json5: "json",
  jsx: "jsx",
  md: "markdown",
  mjs: "javascript",
  py: "python",
  rs: "rust",
  sh: "shellscript",
  shell: "shellscript",
  ts: "typescript",
  tsx: "tsx",
  yml: "yaml",
};

const extensionToLanguage: Record<string, string> = {
  bash: "shellscript",
  cjs: "javascript",
  css: "css",
  html: "html",
  js: "javascript",
  json: "json",
  json5: "json",
  jsonc: "jsonc",
  jsonl: "jsonl",
  jsx: "jsx",
  less: "less",
  md: "markdown",
  mjs: "javascript",
  py: "python",
  rs: "rust",
  scss: "scss",
  sh: "shellscript",
  sql: "sql",
  text: "text",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  txt: "text",
  yaml: "yaml",
  yml: "yaml",
  zsh: "shellscript",
};

type ShikiLanguageLoader = () => Promise<SpecialLanguage | LanguageInput>;

const languageLoaders = {
  "angular-html": () => import("@shikijs/langs/angular-html"),
  "angular-ts": () => import("@shikijs/langs/angular-ts"),
  astro: () => import("@shikijs/langs/astro"),
  c: () => import("@shikijs/langs/c"),
  cpp: () => import("@shikijs/langs/cpp"),
  csharp: () => import("@shikijs/langs/csharp"),
  css: () => import("@shikijs/langs/css"),
  dart: () => import("@shikijs/langs/dart"),
  docker: () => import("@shikijs/langs/docker"),
  glsl: () => import("@shikijs/langs/glsl"),
  go: () => import("@shikijs/langs/go"),
  graphql: () => import("@shikijs/langs/graphql"),
  html: () => import("@shikijs/langs/html"),
  http: () => import("@shikijs/langs/http"),
  hurl: () => import("@shikijs/langs/hurl"),
  java: () => import("@shikijs/langs/java"),
  javascript: () => import("@shikijs/langs/javascript"),
  jinja: () => import("@shikijs/langs/jinja"),
  json: () => import("@shikijs/langs/json"),
  json5: () => import("@shikijs/langs/json5"),
  jsonc: () => import("@shikijs/langs/jsonc"),
  jsonl: () => import("@shikijs/langs/jsonl"),
  jsx: () => import("@shikijs/langs/jsx"),
  julia: () => import("@shikijs/langs/julia"),
  kotlin: () => import("@shikijs/langs/kotlin"),
  less: () => import("@shikijs/langs/less"),
  lua: () => import("@shikijs/langs/lua"),
  markdown: () => import("@shikijs/langs/markdown"),
  mdc: () => import("@shikijs/langs/mdc"),
  mdx: () => import("@shikijs/langs/mdx"),
  "objective-c": () => import("@shikijs/langs/objective-c"),
  php: () => import("@shikijs/langs/php"),
  postcss: () => import("@shikijs/langs/postcss"),
  prisma: () => import("@shikijs/langs/prisma"),
  python: () => import("@shikijs/langs/python"),
  ruby: () => import("@shikijs/langs/ruby"),
  rust: () => import("@shikijs/langs/rust"),
  sass: () => import("@shikijs/langs/sass"),
  scss: () => import("@shikijs/langs/scss"),
  shellscript: () => import("@shikijs/langs/shellscript"),
  solidity: () => import("@shikijs/langs/solidity"),
  sql: () => import("@shikijs/langs/sql"),
  svelte: () => import("@shikijs/langs/svelte"),
  swift: () => import("@shikijs/langs/swift"),
  toml: () => import("@shikijs/langs/toml"),
  "ts-tags": () => import("@shikijs/langs/ts-tags"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  typst: () => import("@shikijs/langs/typst"),
  vue: () => import("@shikijs/langs/vue"),
  "vue-html": () => import("@shikijs/langs/vue-html"),
  "vue-vine": () => import("@shikijs/langs/vue-vine"),
  wasm: () => import("@shikijs/langs/wasm"),
  wgsl: () => import("@shikijs/langs/wgsl"),
  yaml: () => import("@shikijs/langs/yaml"),
  zig: () => import("@shikijs/langs/zig"),
} satisfies Record<string, ShikiLanguageLoader>;

const hasLanguageLoader = (language: string): language is keyof typeof languageLoaders =>
  language in languageLoaders;

let highlighterPromise: ReturnType<typeof createHighlighterCore> | null = null;
const languageLoadPromiseCache = new Map<string, Promise<void>>();

const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [import("@shikijs/themes/github-dark"), import("@shikijs/themes/github-light")],
    });
  }
  return highlighterPromise;
};

const resolveShikiTheme = (theme?: ResolvedTheme | null) => SHIKI_THEME[theme ?? "dark"];

const normalizeLanguage = (language?: string | null) => {
  if (!language) {
    return "text";
  }
  const lowered = language.toLowerCase();
  return languageAliases[lowered] ?? lowered;
};

const ensureLanguageLoaded = async (language?: string | null) => {
  const normalized = normalizeLanguage(language);
  if (normalized === "text") {
    return "text";
  }

  const highlighter = await getHighlighter();
  if (highlighter.getLoadedLanguages().includes(normalized)) {
    return normalized;
  }
  if (!hasLanguageLoader(normalized)) {
    return "text";
  }

  const cachedPromise = languageLoadPromiseCache.get(normalized);
  if (cachedPromise) {
    await cachedPromise;
    return highlighter.getLoadedLanguages().includes(normalized) ? normalized : "text";
  }

  const loadPromise = (async () => {
    const languagesToLoad = [await languageLoaders[normalized]()] as (
      | SpecialLanguage
      | LanguageInput
    )[];
    await highlighter.loadLanguage(...languagesToLoad);
  })();

  languageLoadPromiseCache.set(normalized, loadPromise);
  try {
    await loadPromise;
  } finally {
    languageLoadPromiseCache.delete(normalized);
  }

  return highlighter.getLoadedLanguages().includes(normalized) ? normalized : "text";
};

const createRenderer = (theme: "github-dark" | "github-light") => {
  const md = createMarkdownItAsync({ breaks: true, html: false, linkify: true, typographer: true });

  const defaultLinkOpen =
    md.renderer.rules.link_open ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  const defaultCodeInline =
    md.renderer.rules.code_inline ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
    const existing = tokens[idx].attrGet("class");
    // Add "md-inline-code" class to inline code for better styling control, while preserving existing classes if any
    tokens[idx].attrSet("class", existing ? `${existing} md-inline-code` : "md-inline-code");
    return defaultCodeInline(tokens, idx, options, env, self);
  };

  md.use(
    fromAsyncCodeToHtml(
      async (code, options) => {
        const highlighter = await getHighlighter();
        const resolvedLanguage = await ensureLanguageLoaded(options.lang);
        return highlighter.codeToHtml(code, { ...options, lang: resolvedLanguage, theme });
      },
      { theme },
    ),
  );

  return md;
};

const rendererByTheme: Record<
  "github-dark" | "github-light",
  ReturnType<typeof createRenderer> | null
> = {
  "github-dark": null,
  "github-light": null,
};

const DISALLOWED_BLOCK_ELEMENTS = /<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi;
const DISALLOWED_VOID_TAGS = /<(?:link|meta|base)[^>]*\/?>/gi;
const EVENT_HANDLER_ATTRIBUTES = /\s+on[a-z]+=(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/gi;
const SRCDOC_ATTRIBUTES = /\s+srcdoc=(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/gi;
const UNSAFE_URL_ATTRIBUTES =
  /\s+(href|src)=(?:"(?:javascript:|vbscript:|data:text\/html)[^"]*"|'(?:javascript:|vbscript:|data:text\/html)[^']*'|(?:javascript:|vbscript:|data:text\/html)[^\s"'=<>`]*)/gi;

export const sanitizeRenderedHtml = (html: string) =>
  html
    .replace(DISALLOWED_BLOCK_ELEMENTS, "")
    .replace(DISALLOWED_VOID_TAGS, "")
    .replace(EVENT_HANDLER_ATTRIBUTES, "")
    .replace(SRCDOC_ATTRIBUTES, "")
    .replace(UNSAFE_URL_ATTRIBUTES, ' $1="#"');

export const renderMarkdownAsync = async (content: string, theme?: ResolvedTheme | null) => {
  const shikiTheme = resolveShikiTheme(theme);
  if (!rendererByTheme[shikiTheme]) {
    rendererByTheme[shikiTheme] = createRenderer(shikiTheme);
  }
  return sanitizeRenderedHtml(await rendererByTheme[shikiTheme].renderAsync(content));
};

const getLanguageFromPath = (path?: string | null) => {
  if (!path) {
    return null;
  }
  const dotIndex = path.lastIndexOf(".");
  if (dotIndex === -1) {
    return null;
  }
  return extensionToLanguage[path.slice(dotIndex + 1).toLowerCase()] ?? null;
};

const renderCodeAsync = async (
  content: string,
  language?: string | null,
  theme?: ResolvedTheme | null,
) => {
  const highlighter = await getHighlighter();
  const resolvedLanguage = await ensureLanguageLoaded(language);
  return sanitizeRenderedHtml(
    highlighter.codeToHtml(content, {
      lang: resolvedLanguage,
      theme: resolveShikiTheme(theme),
    }),
  );
};

export const renderContentAsync = async ({
  content,
  path,
  isMarkdown,
  theme,
}: {
  content: string;
  path?: string | null;
  isMarkdown?: boolean | null;
  theme?: ResolvedTheme | null;
}) => {
  const shouldRenderMarkdown = isMarkdown ?? path?.toLowerCase().endsWith(".md") ?? false;

  if (shouldRenderMarkdown) {
    return await renderMarkdownAsync(content, theme);
  }

  return await renderCodeAsync(content, getLanguageFromPath(path), theme);
};
