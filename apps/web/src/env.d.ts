// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />

import type { authClient } from "@/lib/auth-client";

type Session = typeof authClient.$Infer.Session;

declare global {
  namespace App {
    interface Locals {
      user: Session["user"] | null;
      session: Session["session"] | null;
    }
  }
}
