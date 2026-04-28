const internationalization = {
  "locales": [
    "en",
    "de",
    "zh-Hans"
  ],
  "requiredLocales": [
    "en",
    "de",
    "zh-Hans"
  ],
  "strictMode": "inclusive",
  "defaultLocale": "en"
};
const routing = {
  "mode": "prefix-no-default",
  "storage": {
    "localStorage": [
      {
        "name": "INTLAYER_LOCALE"
      }
    ]
  },
  "basePath": ""
};
const editor = {
  "applicationURL": "http://localhost:4321",
  "editorURL": "http://localhost:8000",
  "cmsURL": "https://app.intlayer.org",
  "backendURL": "https://back.intlayer.org",
  "port": 8000,
  "enabled": false,
  "dictionaryPriorityStrategy": "local_first",
  "liveSync": true,
  "liveSyncPort": 4000,
  "liveSyncURL": "http://localhost:4000"
};
const log = {
  "mode": "default",
  "prefix": "\u001b[38;5;239m[intlayer] \u001b[0m"
};
const system = {
  "baseDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web",
  "moduleAugmentationDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/types",
  "unmergedDictionariesDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/unmerged_dictionary",
  "remoteDictionariesDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/remote_dictionary",
  "dictionariesDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/dictionary",
  "dynamicDictionariesDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/dynamic_dictionary",
  "fetchDictionariesDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/fetch_dictionary",
  "typesDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/types",
  "mainDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/main",
  "configDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/config",
  "cacheDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/cache",
  "tempDir": "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web/.intlayer/tmp"
};
const content = {
  "fileExtensions": [
    ".content.ts",
    ".content.js",
    ".content.cjs",
    ".content.mjs",
    ".content.json",
    ".content.json5",
    ".content.jsonc",
    ".content.tsx",
    ".content.jsx"
  ],
  "contentDir": [
    "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web"
  ],
  "codeDir": [
    "/Users/jiewang/Projects/skills-refactor/skills-re/apps/web"
  ],
  "excludedPath": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.intlayer/**",
    "**/.next/**",
    "**/.nuxt/**",
    "**/.expo/**",
    "**/.vercel/**",
    "**/.turbo/**",
    "**/.tanstack/**"
  ],
  "watch": true
};
const ai = {
  "provider": "gemini",
  "apiKey": "AIzaSyAddNt2gximFN928FwCCGobr8sZ6HXLMWQ",
  "model": "gemini-3.1-flash-lite",
  "applicationContext": ""
};
const dictionary = {
  "fill": true,
  "contentAutoTransformation": false,
  "location": "local",
  "importMode": "static"
};
const build = {
  "mode": "auto",
  "minify": true,
  "purge": false,
  "traversePattern": [
    "/*.{js,ts,mjs,cjs,jsx,tsx,astro}",
    "!/node_modules/**"
  ],
  "outputFormat": [
    "esm",
    "cjs"
  ],
  "cache": true,
  "checkTypes": false
};
const compiler = {
  "enabled": true,
  "dictionaryKeyPrefix": "",
  "noMetadata": false,
  "saveComponents": false
};
const configuration = { internationalization, routing, editor, log, system, content, ai, dictionary, build, compiler };

module.exports.internationalization = internationalization;
module.exports.routing = routing;
module.exports.editor = editor;
module.exports.log = log;
module.exports.system = system;
module.exports.content = content;
module.exports.ai = ai;
module.exports.dictionary = dictionary;
module.exports.build = build;
module.exports.compiler = compiler;
module.exports = configuration;
