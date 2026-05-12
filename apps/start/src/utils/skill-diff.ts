import { diffLines } from "diff";

export const buildSnapshotLineDiff = (leftContent: string, rightContent: string) => {
  const changes = diffLines(leftContent, rightContent);
  const lines: {
    kind: "added" | "context" | "removed";
    leftLineNumber?: number;
    rightLineNumber?: number;
    text: string;
  }[] = [];
  let leftLineNumber = 1;
  let rightLineNumber = 1;
  let added = 0;
  let removed = 0;
  let context = 0;

  for (const change of changes) {
    let kind: "added" | "removed" | "context";
    if (change.added) {
      kind = "added";
    } else if (change.removed) {
      kind = "removed";
    } else {
      kind = "context";
    }
    const chunkLines = change.value.replace(/\n$/, "").split("\n");

    for (const text of chunkLines) {
      if (kind === "added") {
        lines.push({ kind, rightLineNumber, text });
        added += 1;
        rightLineNumber += 1;
      } else if (kind === "removed") {
        lines.push({ kind, leftLineNumber, text });
        removed += 1;
        leftLineNumber += 1;
      } else {
        lines.push({ kind, leftLineNumber, rightLineNumber, text });
        context += 1;
        leftLineNumber += 1;
        rightLineNumber += 1;
      }
    }
  }

  return {
    lines,
    summary: { added, context, removed },
  };
};
