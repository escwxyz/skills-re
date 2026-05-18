import { Outlet, createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { loginDialogAtom } from "@/atoms/app";
import { LoginDialog } from "@/components/login-dialog";

export const Route = createFileRoute("/_authedLayout")({
  ssr: "data-only",
  component: AuthedLayout,
  errorComponent: LoginGate,
});

function LoginGate() {
  const { currentUser } = useRouteContext({ from: "__root__" });
  const setLoginDialog = useSetAtom(loginDialogAtom);

  useEffect(() => {
    if (!currentUser) {
      setLoginDialog((prev) => ({ ...prev, open: true }));
    }
    return () => setLoginDialog((prev) => ({ ...prev, open: false }));
  }, [currentUser, setLoginDialog]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoginDialog />
    </div>
  );
}

function AuthedLayout() {
  return <Outlet />;
}
