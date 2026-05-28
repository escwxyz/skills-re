import type { server, start } from "@skills-re/infra/alchemy.run";

// This file infers types for the cloudflare:workers environment from your Alchemy Worker.
// @see https://alchemy.run/concepts/bindings/#type-safe-bindings

export type CloudflareServerEnv = NonNullable<typeof server.Env>;
export type CloudflareStartEnv = NonNullable<typeof start.Env>;
export type CloudflareEnv = CloudflareServerEnv & CloudflareStartEnv;

declare global {
  type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    export interface Env extends CloudflareEnv {}
  }
}
