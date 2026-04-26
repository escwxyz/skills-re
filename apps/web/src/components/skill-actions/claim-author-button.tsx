"use client";

import { useStore } from "@nanostores/react";
import { useState } from "react";

import { isAuthenticatedAtom, isLoginDialogOpenAtom } from "@/stores/app";
import { orpc } from "@/lib/orpc";

interface Props {
  slug: string;
}

export function ClaimAuthorButton({ slug }: Props) {
  const isAuthenticated = useStore(isAuthenticatedAtom);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"claimed" | "already" | null>(null);
  const [error, setError] = useState<string | null>(null);
  let buttonLabel = "Sign in to Claim";

  if (isAuthenticated) {
    buttonLabel = "Claim as Author";
  }

  if (pending) {
    buttonLabel = "Claiming…";
  }

  const handleClick = async () => {
    if (!isAuthenticated) {
      isLoginDialogOpenAtom.set(true);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await orpc.skills.claimAsAuthor({ slug });
      setResult(res.alreadyClaimed ? "already" : "claimed");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to claim. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  if (result === "claimed") {
    return (
      <div
        style={{
          padding: "11px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: "10.5px",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          border: "1px solid var(--rule)",
          color: "var(--muted-text)",
          textAlign: "center",
        }}
      >
        Claimed — you are now an author.
      </div>
    );
  }

  if (result === "already") {
    return (
      <div
        style={{
          padding: "11px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: "10.5px",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          border: "1px solid var(--rule)",
          color: "var(--muted-text)",
          textAlign: "center",
        }}
      >
        Already linked to your account.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <button
        onClick={handleClick}
        disabled={pending}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          padding: "11px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: "10.5px",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          textDecoration: "none",
          background: "var(--ink)",
          color: "var(--paper)",
          border: "1px solid var(--ink)",
          transition: "opacity .15s",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {buttonLabel}
      </button>
      {error && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: ".1em",
            color: "var(--editorial-red)",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
