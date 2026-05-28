// oxlint-disable typescript/no-empty-object-type
// oxlint-disable typescript/no-empty-interface
import type { CloudflareStartEnv } from "./env.d.ts";

declare global {
  type Env = CloudflareStartEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends CloudflareStartEnv {}
  }
}
