import { fromAsyncCodeToHtml } from "@shikijs/markdown-it/async";
import anchor from "markdown-it-anchor";
import { createMarkdownItAsync } from "markdown-it-async";
import type { LanguageInput, SpecialLanguage } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { slugifyHeadingBase } from "@skills-re/utils";

export type ResolvedTheme = "dark" | "light";

const DUAL_THEMES = { light: "github-light", dark: "github-dark" } as const;

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

interface MarkdownEnv {
  fileTreeBase?: string;
  filePath?: string;
}

const isRelativeUrl = (href: string): boolean => {
  if (!href) {
    return false;
  }
  return (
    !href.startsWith("http://") &&
    !href.startsWith("https://") &&
    !href.startsWith("//") &&
    !href.startsWith("/") &&
    !href.startsWith("#") &&
    !href.startsWith("mailto:") &&
    !href.startsWith("tel:")
  );
};

const resolveRelativePath = (basePath: string, relativePath: string): string => {
  const hashIndex = relativePath.indexOf("#");
  const pathWithoutFragment = hashIndex === -1 ? relativePath : relativePath.slice(0, hashIndex);
  const baseDir = basePath.includes("/") ? basePath.slice(0, basePath.lastIndexOf("/")) : "";
  const combined = baseDir ? `${baseDir}/${pathWithoutFragment}` : pathWithoutFragment;
  const segments = combined.split("/").filter((s) => s !== "" && s !== ".");
  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === "..") {
      resolved.pop();
    } else {
      resolved.push(segment);
    }
  }
  return resolved.join("/");
};

const createRenderer = () => {
  const md = createMarkdownItAsync({ breaks: true, html: false, linkify: true, typographer: true });

  const headingCounts = new Map<string, number>();
  md.use(anchor, {
    level: [2, 3, 4, 5, 6],
    slugify: (value) => {
      const baseSlug = slugifyHeadingBase(value);
      const currentCount = headingCounts.get(baseSlug) ?? 0;
      headingCounts.set(baseSlug, currentCount + 1);
      return currentCount === 0 ? baseSlug : `${baseSlug}-${currentCount + 1}`;
    },
  });

  const originalRenderAsync = md.renderAsync.bind(md);
  md.renderAsync = async (src: string, env?: object) => {
    headingCounts.clear();
    return await originalRenderAsync(src, env);
  };

  md.renderer.rules.table_open = () => '<div style="overflow-x:auto;max-width:100%">\n<table>';
  md.renderer.rules.table_close = () => "</table>\n</div>\n";

  const defaultLinkOpen =
    md.renderer.rules.link_open ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx]?.attrGet("href") ?? "";
    if (isRelativeUrl(href)) {
      const { fileTreeBase, filePath } = (env as MarkdownEnv | undefined) ?? {};
      if (fileTreeBase) {
        const resolvedPath = resolveRelativePath(filePath ?? "", href);
        tokens[idx]?.attrSet("href", `${fileTreeBase}?path=${encodeURIComponent(resolvedPath)}`);
      } else {
        tokens[idx]?.attrSet("href", "#");
      }
    } else {
      tokens[idx]?.attrSet("target", "_blank");
      tokens[idx]?.attrSet("rel", "noopener noreferrer");
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  const defaultCodeInline =
    md.renderer.rules.code_inline ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
    const existing = tokens[idx]?.attrGet("class");
    // Add "md-inline-code" class to inline code for better styling control, while preserving existing classes if any
    tokens[idx]?.attrSet("class", existing ? `${existing} md-inline-code` : "md-inline-code");
    return defaultCodeInline(tokens, idx, options, env, self);
  };

  md.use(
    fromAsyncCodeToHtml(
      async (code, options) => {
        const highlighter = await getHighlighter();
        const resolvedLanguage = await ensureLanguageLoaded(options.lang);
        return highlighter.codeToHtml(code, { lang: resolvedLanguage, themes: DUAL_THEMES });
      },
      { themes: DUAL_THEMES },
    ),
  );

  return md;
};

let renderer: ReturnType<typeof createRenderer> | null = null;

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

export const renderMarkdownAsync = async (content: string, env?: MarkdownEnv) => {
  if (!renderer) {
    renderer = createRenderer();
  }
  return sanitizeRenderedHtml(await renderer.renderAsync(content, env));
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

const renderCodeAsync = async (content: string, language?: string | null) => {
  const highlighter = await getHighlighter();
  const resolvedLanguage = await ensureLanguageLoaded(language);
  return sanitizeRenderedHtml(
    highlighter.codeToHtml(content, {
      lang: resolvedLanguage,
      themes: DUAL_THEMES,
    }),
  );
};

export const renderContentAsync = async ({
  content,
  fileTreeBase,
  isMarkdown,
  path,
}: {
  content: string;
  fileTreeBase?: string;
  isMarkdown?: boolean | null;
  path?: string | null;
}) => {
  const shouldRenderMarkdown = isMarkdown ?? path?.toLowerCase().endsWith(".md") ?? false;

  if (shouldRenderMarkdown) {
    return await renderMarkdownAsync(content, { fileTreeBase, filePath: path ?? undefined });
  }

  return await renderCodeAsync(content, getLanguageFromPath(path));
};
