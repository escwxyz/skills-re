import { m } from "@/paraglide/messages";
import { useGithubSubmitForm } from "@/hooks/use-github-submit-form";
import { Form } from "@/components/ui/form";

import {
  GithubSubmitActionBar,
  GithubSubmitLogsPanel,
  GithubSubmitPreviewPanel,
  GithubSubmitRepoUrlFieldRow,
  GithubSubmitStatusRail,
  GithubSubmitSubmissionError,
} from "@/components/github-submit-form-sections";

export const GithubSubmitForm = () => {
  const githubSubmit = useGithubSubmitForm();

  return (
    <githubSubmit.form.AppForm>
      <Form className="px-6 py-10 lg:px-8">
        <h3 className="font-display mb-4.5 border-b border-border pb-2.5 text-3xl font-normal">
          {m.page_title()}
        </h3>

        <p className="font-serif mb-7 max-w-160 text-sm leading-relaxed text-ink-2">
          {m.page_description()}
        </p>

        <div className="mb-6">
          <githubSubmit.form.AppField name="repoUrl">
            {(field: { handleChange: (value: string) => void; state: { value: string } }) => (
              <GithubSubmitRepoUrlFieldRow
                disabled={
                  githubSubmit.fetchStatus === "fetching" ||
                  githubSubmit.submitStatus === "submitting"
                }
                fetchStatus={githubSubmit.fetchStatus}
                onChange={(value) => {
                  field.handleChange(value);
                  githubSubmit.handleRepoUrlChange(value);
                }}
                onSubmit={() => {
                  void githubSubmit.form.handleSubmit();
                }}
                submitStatus={githubSubmit.submitStatus}
                value={field.state.value}
              />
            )}
          </githubSubmit.form.AppField>
        </div>

        <GithubSubmitLogsPanel fetchStatus={githubSubmit.fetchStatus} logs={githubSubmit.logs} />

        <GithubSubmitSubmissionError message={githubSubmit.submitError} />

        <GithubSubmitStatusRail statusItems={githubSubmit.statusItems} />

        {githubSubmit.repoPreview ? (
          <GithubSubmitPreviewPanel
            onClearSelectedSkillRootPaths={githubSubmit.handleClearSelectedSkillRootPaths}
            onSelectAllSkillRootPaths={githubSubmit.handleSelectAllSkillRootPaths}
            onSelectedSkillRootPathsChange={githubSubmit.handleSelectedSkillRootPathsChange}
            previewDiagnostics={githubSubmit.previewDiagnostics}
            repoPreview={githubSubmit.repoPreview}
            selectedSkillRootPaths={githubSubmit.selectedSkillRootPaths}
          />
        ) : null}

        <GithubSubmitActionBar
          canSubmit={githubSubmit.canSubmit}
          onSubmit={githubSubmit.handleSubmit}
          selectedSummary={githubSubmit.selectedSummary}
          submitLabel={githubSubmit.submitLabel}
        />
      </Form>
    </githubSubmit.form.AppForm>
  );
};
