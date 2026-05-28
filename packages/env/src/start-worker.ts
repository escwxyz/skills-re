// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../env.start.d.ts" />

import { env as cloudflareEnv } from "cloudflare:workers";

export const env = cloudflareEnv;
