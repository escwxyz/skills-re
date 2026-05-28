// oxlint-disable typescript/no-empty-object-type
import type { CloudflareServerEnv } from "./env.d.ts";

declare global {
  type Env = CloudflareServerEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    // oxlint-disable-next-line typescript/no-empty-interface
    interface Env extends CloudflareServerEnv {}
  }
}
