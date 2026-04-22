"use client";

import { isLoginDialogOpenAtom } from "@/stores/app";
import { LoginDialog } from "@/components/login-dialog";

export const LoginButton = () => (
  <LoginDialog onOpenChange={(open) => !open && isLoginDialogOpenAtom.set(false)} />
);
