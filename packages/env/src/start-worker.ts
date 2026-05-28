// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../env.d.ts" />

import { env as cloudflareEnv } from "cloudflare:workers";

import type { CloudflareStartEnv } from "../env.d.ts";

export const env = cloudflareEnv as unknown as CloudflareStartEnv;
