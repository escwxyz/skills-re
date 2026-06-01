/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildSkillEvalStreamUrl,
  formatSkillEvalEventLine,
  getDefaultSelectedCaseIds,
  getRunButtonLabel,
  SkillEvalSandboxPanel,
} from "./skill-eval-sandbox-panel";

const initialData = {
  agents: [
    {
      displayName: "OpenCode",
      id: "agent-1",
      provider: "opencode",
    },
  ],
  latestRun: null,
  skill: {
    id: "skill-1",
  },
  suite: {
    caseCount: 2,
    cases: [
      {
        id: "case-1",
        promptPreview: "Review a small patch.",
      },
      {
        id: "case-2",
        promptPreview: "Review a larger patch.",
        title: "Large patch",
      },
    ],
    status: "valid" as const,
    validationErrors: [],
  },
};

describe("SkillEvalSandboxPanel", () => {
  test("builds websocket stream urls from the server origin", () => {
    expect(buildSkillEvalStreamUrl("run 1", "https://api.skills.test")).toBe(
      "wss://api.skills.test/skill-eval-sandbox/runs/run%201/stream",
    );
    expect(buildSkillEvalStreamUrl("run-1", "http://localhost:3000")).toBe(
      "ws://localhost:3000/skill-eval-sandbox/runs/run-1/stream",
    );
  });

  test("selects all suite cases by default", () => {
    expect(getDefaultSelectedCaseIds(initialData)).toEqual(["case-1", "case-2"]);
  });

  test("maps run creation and stream events into display states", () => {
    expect(String(getRunButtonLabel("creating"))).toBe("Creating...");
    expect(String(getRunButtonLabel("idle"))).toBe("Run eval");
    expect(
      formatSkillEvalEventLine({
        kind: "status",
        payload: {
          to: "running",
        },
      }),
    ).toBe("status: running");
    expect(
      formatSkillEvalEventLine({
        kind: "stderr",
        payload: {
          chunk: "stream disconnected",
        },
      }),
    ).toBe("stream disconnected");
  });

  test("renders agent, scope, case controls, and terminal shell", () => {
    const markup = renderToStaticMarkup(<SkillEvalSandboxPanel initialData={initialData} />);

    expect(markup).toContain("OpenCode");
    expect(markup).toContain("All cases");
    expect(markup).toContain("Large patch");
    expect(markup).toContain("$ waiting");
  });

  test("renders blocked states for unavailable suites and disabled agents", () => {
    const markup = renderToStaticMarkup(
      <SkillEvalSandboxPanel
        initialData={{
          ...initialData,
          agents: [],
          suite: {
            ...initialData.suite,
            status: "invalid",
            validationErrors: ["Missing fixture."],
          },
        }}
      />,
    );

    expect(markup).toContain("Missing fixture.");
    expect(markup).toContain("No sandbox agents are enabled");
    expect(markup).toContain("disabled");
  });
});
