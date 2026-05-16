// oxlint-disable no-nested-ternary
import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import { useMutation } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-form";
import { useAtom } from "jotai";

import {
  isLoginDialogOpenAtom,
  loginDialogDescriptionAtom,
  loginDialogOnlyGithubAtom,
  loginDialogTitleAtom,
} from "@/atoms/app";
import { githubSubmitUrlSchema } from "@/lib/github-submit";
import type { GithubSubmitInput } from "@/lib/github-submit";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { useAppForm } from "@/hooks/form-hook";
import { buildPreviewDiagnostics } from "@/hooks/github-submit-diagnostics";
import type {
  PreviewDiagnosticMessages,
  RepoPreview,
  SkillPreview,
  InvalidSkillPreview,
} from "@/hooks/github-submit-diagnostics";
import { isRateLimitedError } from "@/utils/is-rate-limited-error";

export type { RepoPreview, SkillPreview, InvalidSkillPreview, PreviewDiagnosticMessages };

export type FetchStatus = "idle" | "fetching" | "fetched" | "error";
export type SubmitStatus = "idle" | "submitting" | "submitted" | "error";

export interface StatusItem {
  id: string;
  label: ReactNode;
  status: FetchStatus | SubmitStatus;
  statusText: ReactNode;
}

export interface GithubSubmitFormValues {
  repoUrl: string;
  selectedSkillRootPaths: string[];
}

const _inferFormType = () =>
  useAppForm({
    defaultValues: { repoUrl: "", selectedSkillRootPaths: [] as string[] },
  });
type GithubSubmitFormInstance = ReturnType<typeof _inferFormType>;

export interface GithubSubmitFormModel {
  canSubmit: boolean;
  fetchStatus: FetchStatus;
  form: GithubSubmitFormInstance;
  handleClearSelectedSkillRootPaths: () => void;
  handleRepoUrlChange: (value: string) => void;
  handleSelectedSkillRootPathsChange: (value: string[]) => void;
  handleSelectAllSkillRootPaths: () => void;
  handleSubmit: () => Promise<void>;
  logBoxRef: RefObject<HTMLDivElement | null>;
  logs: string[];
  previewDiagnostics: string[];
  repoPreview: RepoPreview | null;
  selectedSkillRootPaths: string[];
  selectedSummary: string;
  statusItems: readonly StatusItem[];
  submitError: string | null;
  submitLabel: ReactNode;
  submitStatus: SubmitStatus;
}

const RESET_DELAY_MS = 5000;

const getSubmitErrorMessage = (error: unknown) =>
  isRateLimitedError(error)
    ? "You are sending submissions too quickly. Please wait a moment and try again."
    : "Failed to submit GitHub repository. Please try again.";

export const useGithubSubmitForm = (): GithubSubmitFormModel => {
  const [logs, setLogs] = useState<string[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [repoTarget, setRepoTarget] = useState<GithubSubmitInput | null>(null);
  const [repoPreview, setRepoPreview] = useState<RepoPreview | null>(null);
  const [submitLocked, setSubmitLocked] = useState(false);
  const [, setLoginDialogOpen] = useAtom(isLoginDialogOpenAtom);
  const [, setLoginDialogOnlyGithub] = useAtom(loginDialogOnlyGithubAtom);
  const [, setLoginDialogTitle] = useAtom(loginDialogTitleAtom);
  const [, setLoginDialogDescription] = useAtom(loginDialogDescriptionAtom);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRepoMutation = useMutation(orpc.github.fetchRepo.mutationOptions({}));
  const submitGithubRepoPublicMutation = useMutation(
    orpc.skills.submitGithubRepoPublic.mutationOptions({}),
  );

  const form = useAppForm({
    defaultValues: {
      repoUrl: "",
      selectedSkillRootPaths: [] as string[],
    },
    onSubmit: async ({ value }) => {
      const parsed = githubSubmitUrlSchema.safeParse(value.repoUrl);

      if (!parsed.success) {
        setFetchStatus("error");
        setSubmitStatus("idle");
        setSubmitError(null);
        setRepoTarget(null);
        setRepoPreview(null);
        form.setFieldValue("selectedSkillRootPaths", []);
        setLogs([
          `> ${m.logs_error_prefix({})} ${parsed.error.issues[0]?.message ?? m.logs_invalid_url_error({})}`,
        ]);
        return;
      }

      const target = parsed.data;
      form.setFieldValue("repoUrl", target.githubUrl);
      setRepoTarget(target);
      setFetchStatus("fetching");
      setSubmitStatus("idle");
      setSubmitError(null);
      setRepoPreview(null);
      form.setFieldValue("selectedSkillRootPaths", []);
      setSubmitLocked(false);
      setLogs([
        `> ${m.logs_validating_url({})}`,
        `> ${m.logs_normalized_url({ githubUrl: target.githubUrl })}`,
        `> ${m.logs_fetching_metadata({})}`,
      ]);

      await fetchRepoMutation.mutateAsync(
        { githubUrl: target.githubUrl },
        {
          onError: (error) => {
            console.error("Failed to fetch GitHub repository preview", error);
            setLogs((prev) => [...prev, `> ${m.logs_failed_to_fetch_preview({})}`]);
            setFetchStatus("error");
          },
          onSuccess: (data) => {
            const validSkillPaths = data.skills.map((skill) => skill.skillRootPath);
            const folderName = data.requestedSkillPath ?? m.preview_skill_root_path_fallback({});
            const diagnostics = buildPreviewDiagnostics(data, m);

            setLogs((prev) => [
              ...prev,
              `> ${m.logs_repository_summary({
                owner: data.owner,
                repo: data.repo,
                branch: data.branch,
              })}`,
              `> ${m.logs_found_publishable_skills({
                count: data.skills.length,
                folder: folderName,
              })}`,
              data.invalidSkills.length > 0
                ? `> ${m.logs_skipped_invalid_skills({
                    count: data.invalidSkills.length,
                  })}`
                : `> ${m.logs_no_invalid_skills_skipped({})}`,
              ...diagnostics.map((line) => `> ${line}`),
              validSkillPaths.length > 0
                ? `> ${m.logs_review_and_choose({})}`
                : `> ${m.logs_no_publishable_skills({})}`,
            ]);

            setRepoPreview(data);
            form.setFieldValue("selectedSkillRootPaths", validSkillPaths);
            setFetchStatus("fetched");
          },
        },
      );
    },
  });

  const selectedSkillRootPaths = useStore(
    form.store,
    (state) => state.values.selectedSkillRootPaths,
  );

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const scheduleReset = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      setLogs([]);
      setFetchStatus("idle");
      setSubmitStatus("idle");
      setSubmitError(null);
      setRepoTarget(null);
      setRepoPreview(null);
      setSubmitLocked(false);
      form.reset();
    }, RESET_DELAY_MS);
  };

  const handleSubmit = async () => {
    if (!repoPreview || submitLocked || selectedSkillRootPaths.length === 0) {
      return;
    }

    setSubmitLocked(true);
    setSubmitStatus("submitting");
    setSubmitError(null);
    setLogs((prev) => [
      ...prev,
      `> ${m.logs_submitting_selected({
        count: selectedSkillRootPaths.length,
      })}`,
    ]);

    try {
      await submitGithubRepoPublicMutation.mutateAsync(
        {
          owner: repoPreview.owner,
          repo: repoPreview.repo,
          skillRootPath: repoTarget?.skillRootPath,
          skillRootPaths: selectedSkillRootPaths,
        },
        {
          onError: (error) => {
            const errorMessage = getSubmitErrorMessage(error);

            if (isRateLimitedError(error)) {
              setLoginDialogOnlyGithub(true);
              setLoginDialogTitle("GitHub submission limit reached");
              setLoginDialogDescription(errorMessage);
              setLoginDialogOpen(true);
            } else {
              console.error("Failed to submit GitHub repository", error);
            }

            setLogs((prev) => [
              ...prev,
              `> ${m.logs_submission_failed({})}`,
              `> ${isRateLimitedError(error) ? errorMessage : m.logs_live_api_request_failed({})}`,
            ]);
            setSubmitError(errorMessage);
            setSubmitStatus("error");
            setSubmitLocked(false);
          },
          onSuccess: (data) => {
            if (data.status === "submitted") {
              setLogs((prev) => [
                ...prev,
                data.workflowId
                  ? `> ${m.logs_job_queued_with_id({
                      workflowId: data.workflowId,
                    })}`
                  : `> ${m.logs_job_queued({})}`,
                `> ${m.logs_submitted_skills({
                  count: data.skillsCount,
                })}`,
                `> ${m.logs_skills_being_processed({})}`,
              ]);
              setSubmitError(null);
              setSubmitStatus("submitted");
              scheduleReset();
              return;
            }

            setLogs((prev) => [
              ...prev,
              `> ${m.logs_submission_skipped({
                reason: data.reason ?? "unknown",
              })}`,
            ]);
            setSubmitError(
              "Submission was skipped. Please review the selected skills and try again.",
            );
            setSubmitStatus("error");
            setSubmitLocked(false);
          },
        },
      );
    } catch {
      setSubmitLocked(false);
    }
  };

  const selectedSummary = repoPreview
    ? m.footer_selected_summary({
        selected: selectedSkillRootPaths.length,
        total: repoPreview.skills.length,
      })
    : m.preview_no_preview_yet({});
  const previewDiagnostics = repoPreview ? buildPreviewDiagnostics(repoPreview, m) : [];
  const statusItems: readonly StatusItem[] = [
    {
      id: "fetch",
      label: m.rail_fetch({}),
      status: fetchStatus,
      statusText:
        fetchStatus === "idle"
          ? m.status_fetch_idle({})
          : fetchStatus === "fetching"
            ? m.status_fetch_fetching({})
            : fetchStatus === "fetched"
              ? m.status_fetch_fetched({})
              : m.status_fetch_error({}),
    },
    {
      id: "submit",
      label: m.rail_submit({}),
      status: submitStatus,
      statusText:
        submitStatus === "idle"
          ? m.status_submit_idle({})
          : submitStatus === "submitting"
            ? m.status_submit_submitting({})
            : submitStatus === "submitted"
              ? m.status_submit_submitted({})
              : m.status_submit_error({}),
    },
  ] as const;
  const submitLabel: ReactNode =
    submitStatus === "submitting"
      ? m.footer_submitting({})
      : submitStatus === "submitted"
        ? m.footer_queued({})
        : m.footer_submit({});

  const handleRepoUrlChange = () => {
    setLogs([]);
    setFetchStatus("idle");
    setSubmitStatus("idle");
    setSubmitError(null);
    setRepoTarget(null);
    setRepoPreview(null);
    form.setFieldValue("selectedSkillRootPaths", []);
    setSubmitLocked(false);
  };

  const handleSelectAllSkillRootPaths = () => {
    if (!repoPreview) {
      return;
    }

    form.setFieldValue(
      "selectedSkillRootPaths",
      repoPreview.skills.map((skill) => skill.skillRootPath),
    );
  };

  const handleClearSelectedSkillRootPaths = () => {
    form.setFieldValue("selectedSkillRootPaths", []);
  };

  const handleSelectedSkillRootPathsChange = (value: string[]) => {
    form.setFieldValue("selectedSkillRootPaths", value);
  };

  return {
    canSubmit:
      Boolean(repoPreview) &&
      !submitLocked &&
      selectedSkillRootPaths.length > 0 &&
      fetchStatus !== "fetching" &&
      submitStatus !== "submitting",
    fetchStatus,
    form,
    handleClearSelectedSkillRootPaths,
    handleRepoUrlChange,
    handleSelectedSkillRootPathsChange,
    handleSelectAllSkillRootPaths,
    handleSubmit,
    logBoxRef,
    logs,
    previewDiagnostics,
    repoPreview,
    selectedSkillRootPaths,
    selectedSummary,
    statusItems,
    submitError,
    submitLabel,
    submitStatus,
  };
};
