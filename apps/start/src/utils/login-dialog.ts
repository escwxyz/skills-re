import type { LoginDialogState } from "@/atoms/app";

type SetLoginDialog = (
  update: LoginDialogState | ((prev: LoginDialogState) => LoginDialogState),
) => void;

const getCurrentCallbackUrl = () => {
  if (typeof window === "undefined") {
    return;
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const getResetDialogState = (): LoginDialogState => ({
  open: false,
  onlyGithub: false,
  title: null,
  description: null,
  callbackUrl: undefined,
  intent: "continue",
});

export function openLoginDialog(setDialog: SetLoginDialog, options?: Partial<LoginDialogState>) {
  setDialog({
    ...getResetDialogState(),
    open: true,
    intent: "continue",
    callbackUrl: getCurrentCallbackUrl(),
    ...options,
  });
}

export function resetLoginDialog(setDialog: SetLoginDialog) {
  setDialog(getResetDialogState());
}
