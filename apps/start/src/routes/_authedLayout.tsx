import { Outlet, createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { isLoginDialogOpenAtom } from "@/atoms/app";
import { LoginDialog } from "@/components/login-dialog";

export const Route = createFileRoute("/_authedLayout")({
  ssr: "data-only",
  component: AuthedLayout,
  errorComponent: LoginGate,
});

function LoginGate() {
  const { currentUser } = useRouteContext({ from: "__root__" });
  const setOpen = useSetAtom(isLoginDialogOpenAtom);

  useEffect(() => {
    if (!currentUser) {
      setOpen(true);
    }
    return () => setOpen(false);
  }, [currentUser, setOpen]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoginDialog />
    </div>
  );
}

function AuthedLayout() {
  return <Outlet />;
}
