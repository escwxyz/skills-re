/// <reference types="bun-types" />

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";

const DEFAULT_SQL_EXPORT = "eu-data/data.sql";
const DEFAULT_CURRENT_DB_MB = 100;
const DEFAULT_PLANNED_SKILL_COUNT = 20_000;
const DEFAULT_INTERNAL_CEILING_BYTES = 5_000_000_000;
const DEFAULT_HEADROOM_RATIO = 0.8;
const DEFAULT_SAMPLE_SIZE = 1000;
const CANDIDATE_BODY_LIMITS = [32_768, 65_536, 131_072, 262_144, 524_288] as const;

interface CliOptions {
  currentDbBytes: number;
  headroomRatio: number;
  plannedSkillCount: number;
  sampleSize: number;
  sqlExportPath: string;
}

interface SkillRow {
  description: string;
  id: string;
  latestSnapshotId: string | null;
  title: string;
  visibility: string;
}

interface SnapshotRow {
  directoryPath: string;
  entryPath: string;
  id: string;
}

interface SnapshotFileRow {
  path: string;
  size: number;
  snapshotId: string;
}

interface EntryDocument {
  description: string;
  skillId: string;
  size: number;
  title: string;
}

interface CorpusStores {
  skills: Map<string, SkillRow>;
  snapshotFiles: SnapshotFileRow[];
  snapshots: Map<string, SnapshotRow>;
}

const parsePositiveInteger = (name: string, value: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
};

const parsePositiveNumber = (name: string, value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return parsed;
};

const parseOptions = (): CliOptions => {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const prefix = `${name}=`;
    const match = args.find((arg) => arg.startsWith(prefix));
    return match ? match.slice(prefix.length) : null;
  };

  const sqlExportPath = getArg("--sql") ?? DEFAULT_SQL_EXPORT;
  const currentDbMb = getArg("--current-db-mb");
  const plannedSkills = getArg("--planned-skills");
  const sampleSize = getArg("--sample-size");
  const headroomRatio = getArg("--headroom-ratio");

  return {
    currentDbBytes:
      (currentDbMb ? parsePositiveNumber("--current-db-mb", currentDbMb) : DEFAULT_CURRENT_DB_MB) *
      1_000_000,
    headroomRatio: headroomRatio
      ? parsePositiveNumber("--headroom-ratio", headroomRatio)
      : DEFAULT_HEADROOM_RATIO,
    plannedSkillCount: plannedSkills
      ? parsePositiveInteger("--planned-skills", plannedSkills)
      : DEFAULT_PLANNED_SKILL_COUNT,
    sampleSize: sampleSize
      ? parsePositiveInteger("--sample-size", sampleSize)
      : DEFAULT_SAMPLE_SIZE,
    sqlExportPath,
  };
};

const splitSqlValues = (valueList: string) => {
  const tokens: string[] = [];
  let buffer = "";
  let index = 0;
  let depth = 0;

  while (index < valueList.length) {
    const char = valueList[index];

    if (char === "'") {
      buffer += char;
      index += 1;
      while (index < valueList.length) {
        const next = valueList[index];
        buffer += next;
        index += 1;
        if (next === "'") {
          if (valueList[index] === "'") {
            buffer += "'";
            index += 1;
          } else {
            break;
          }
        }
      }
      continue;
    }

    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    } else if (char === "," && depth === 0) {
      tokens.push(buffer.trim());
      buffer = "";
      index += 1;
      continue;
    }

    buffer += char;
    index += 1;
  }

  if (buffer.trim()) {
    tokens.push(buffer.trim());
  }

  return tokens;
};

const decodeSqlValue = (token: string): string | number | null => {
  if (token === "NULL") {
    return null;
  }
  if (token.startsWith("'") && token.endsWith("'")) {
    return token.slice(1, -1).replaceAll("''", "'");
  }
  if (token.startsWith("replace(")) {
    const match = token.match(/^replace\('([\s\S]*)','\\n',char\(10\)\)$/);
    if (!match) {
      return token;
    }
    return match[1].replaceAll("''", "'").replaceAll("\\n", "\n");
  }
  const numeric = Number(token);
  return Number.isFinite(numeric) ? numeric : token;
};

const parseInsertLine = (line: string) => {
  const tableMatch = line.match(/^INSERT INTO "([^"]+)"/);
  if (!tableMatch) {
    return null;
  }

  const columnStart = line.indexOf("(");
  const columnEnd = line.indexOf(")", columnStart);
  const valuesStart = line.indexOf("VALUES(", columnEnd);
  if (columnStart === -1 || columnEnd === -1 || valuesStart === -1) {
    return null;
  }

  const columns = [...line.slice(columnStart + 1, columnEnd).matchAll(/"([^"]+)"/g)].map(
    (match) => match[1],
  );
  const values = splitSqlValues(line.slice(valuesStart + "VALUES(".length, -2)).map(decodeSqlValue);

  return {
    columns,
    table: tableMatch[1],
    values,
  };
};

type InsertRow = NonNullable<ReturnType<typeof parseInsertLine>>;

const getColumn = (row: InsertRow | null, name: string) => {
  if (!row) {
    return null;
  }
  const index = row.columns.indexOf(name);
  return index === -1 ? null : row.values[index];
};

const normalizePath = (value: string) =>
  value.replaceAll("\\", "/").split("/").filter(Boolean).join("/");

const selectEntryFile = (files: SnapshotFileRow[], snapshot: SnapshotRow) => {
  const normalizedEntryPath = normalizePath(snapshot.entryPath);
  const normalizedDirectoryPath = normalizePath(snapshot.directoryPath);
  const directoryEntryPath =
    normalizedDirectoryPath && !normalizedEntryPath.includes("/")
      ? `${normalizedDirectoryPath}/${normalizedEntryPath}`
      : undefined;
  const relativeEntryPath =
    normalizedDirectoryPath && normalizedEntryPath.startsWith(`${normalizedDirectoryPath}/`)
      ? normalizedEntryPath.slice(normalizedDirectoryPath.length + 1)
      : normalizedEntryPath;

  return (
    files.find((file) => normalizePath(file.path) === directoryEntryPath) ??
    files.find((file) => normalizePath(file.path) === normalizedEntryPath) ??
    files.find((file) => normalizePath(file.path) === relativeEntryPath) ??
    files.find((file) => ["SKILL.md", "skill.md"].includes(normalizePath(file.path)))
  );
};

const ingestSkillRow = (row: InsertRow, skills: CorpusStores["skills"]) => {
  const id = getColumn(row, "id");
  const latestSnapshotId = getColumn(row, "latest_snapshot_id");
  const visibility = getColumn(row, "visibility");
  const title = getColumn(row, "title");
  const description = getColumn(row, "description");
  if (typeof id !== "string" || typeof visibility !== "string") {
    return;
  }

  skills.set(id, {
    description: typeof description === "string" ? description : "",
    id,
    latestSnapshotId: typeof latestSnapshotId === "string" ? latestSnapshotId : null,
    title: typeof title === "string" ? title : "",
    visibility,
  });
};

const ingestSnapshotRow = (row: InsertRow, snapshots: CorpusStores["snapshots"]) => {
  const id = getColumn(row, "id");
  const directoryPath = getColumn(row, "directory_path");
  const entryPath = getColumn(row, "entry_path");
  if (
    typeof id !== "string" ||
    typeof directoryPath !== "string" ||
    typeof entryPath !== "string"
  ) {
    return;
  }

  snapshots.set(id, { directoryPath, entryPath, id });
};

const ingestSnapshotFileRow = (row: InsertRow, snapshotFiles: CorpusStores["snapshotFiles"]) => {
  const snapshotId = getColumn(row, "snapshot_id");
  const pathValue = getColumn(row, "path");
  const size = getColumn(row, "size");
  if (typeof snapshotId !== "string" || typeof pathValue !== "string" || typeof size !== "number") {
    return;
  }

  snapshotFiles.push({ path: pathValue, size, snapshotId });
};

const ingestInsertRow = (row: InsertRow | null, stores: CorpusStores) => {
  if (!row) {
    return;
  }
  if (row.table === "skills") {
    ingestSkillRow(row, stores.skills);
    return;
  }
  if (row.table === "snapshots") {
    ingestSnapshotRow(row, stores.snapshots);
    return;
  }
  if (row.table === "snapshot_files") {
    ingestSnapshotFileRow(row, stores.snapshotFiles);
  }
};

const loadCorpus = async (path: string) => {
  if (!existsSync(path)) {
    throw new Error(`SQL export not found: ${path}`);
  }

  const skills = new Map<string, SkillRow>();
  const snapshots = new Map<string, SnapshotRow>();
  const snapshotFiles: SnapshotFileRow[] = [];

  const file = Bun.file(path);
  let pending = "";
  for await (const chunk of file.stream().pipeThrough(new TextDecoderStream())) {
    const parts = `${pending}${chunk}`.split("\n");
    pending = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("INSERT INTO")) {
        continue;
      }
      const row = parseInsertLine(line);
      ingestInsertRow(row, { skills, snapshotFiles, snapshots });
    }
  }
  if (pending.trim().startsWith("INSERT INTO")) {
    ingestInsertRow(parseInsertLine(pending.trim()), { skills, snapshotFiles, snapshots });
  }

  const filesBySnapshot = new Map<string, SnapshotFileRow[]>();
  for (const fileRow of snapshotFiles) {
    const rows = filesBySnapshot.get(fileRow.snapshotId) ?? [];
    rows.push(fileRow);
    filesBySnapshot.set(fileRow.snapshotId, rows);
  }

  const entryDocuments: EntryDocument[] = [];
  let publicSkillsWithoutSnapshot = 0;
  let publicSkillsWithoutEntryFile = 0;

  for (const skill of skills.values()) {
    if (skill.visibility !== "public") {
      continue;
    }
    if (!skill.latestSnapshotId) {
      publicSkillsWithoutSnapshot += 1;
      continue;
    }
    const snapshot = snapshots.get(skill.latestSnapshotId);
    const fileRow = snapshot
      ? selectEntryFile(filesBySnapshot.get(snapshot.id) ?? [], snapshot)
      : null;
    if (!fileRow) {
      publicSkillsWithoutEntryFile += 1;
      continue;
    }
    entryDocuments.push({
      description: skill.description,
      skillId: skill.id,
      size: fileRow.size,
      title: skill.title,
    });
  }

  return {
    entryDocuments,
    privateSkillCount: [...skills.values()].filter((skill) => skill.visibility !== "public").length,
    publicSkillCount: [...skills.values()].filter((skill) => skill.visibility === "public").length,
    publicSkillsWithoutEntryFile,
    publicSkillsWithoutSnapshot,
    totalSkillCount: skills.size,
  };
};

const percentile = (values: number[], p: number) => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].toSorted((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
};

const isAsciiOnly = (value: string) =>
  [...value].every((char) => (char.codePointAt(0) ?? 0) <= 127);

const detectSamples = (documents: EntryDocument[]) => {
  let ascii = 0;
  let accented = 0;
  let cjk = 0;
  let punctuationHeavy = 0;

  for (const document of documents) {
    const text = `${document.title}\n${document.description}`;
    const hasCjk = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(
      text,
    );
    const hasNonAscii = !isAsciiOnly(text);
    if (!hasNonAscii) {
      ascii += 1;
    }
    if (hasCjk) {
      cjk += 1;
    }
    if (hasNonAscii && !hasCjk) {
      accented += 1;
    }
    const punctuationCount = [...text].filter((char) =>
      /[^\p{Letter}\p{Number}\s]/u.test(char),
    ).length;
    if (punctuationCount > 20) {
      punctuationHeavy += 1;
    }
  }

  return { accented, ascii, cjk, punctuationHeavy };
};

const largestBodyOutliers = (documents: EntryDocument[]) =>
  documents
    .toSorted((left, right) => right.size - left.size)
    .slice(0, 10)
    .map((document) => ({
      sizeBytes: document.size,
      skillId: document.skillId,
      title: document.title,
    }));

const makeBody = (size: number) => {
  const seed = "workflow automation search unicode cafe jellyfin 数据 indexing ";
  return seed.repeat(Math.ceil(size / seed.length)).slice(0, size);
};

const measureFtsBytes = (documents: EntryDocument[], maxBodyBytes: number) => {
  const dir = mkdtempSync(join(tmpdir(), "skills-re-fts5-"));
  const dbPath = join(dir, "capacity.sqlite");
  const database = new Database(dbPath);

  try {
    database.exec(`
      CREATE TABLE skill_search_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        slug TEXT NOT NULL,
        author_handle TEXT NOT NULL,
        repository TEXT NOT NULL,
        body TEXT NOT NULL,
        tags TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE skills_fts USING fts5(
        title,
        description,
        slug,
        author_handle,
        repository,
        body,
        tags,
        content='skill_search_documents',
        content_rowid='id',
        tokenize='unicode61 remove_diacritics 2',
        prefix='2 3 4'
      );
      CREATE TRIGGER skill_search_documents_ai AFTER INSERT ON skill_search_documents BEGIN
        INSERT INTO skills_fts(rowid, title, description, slug, author_handle, repository, body, tags)
        VALUES (new.id, new.title, new.description, new.slug, new.author_handle, new.repository, new.body, new.tags);
      END;
    `);

    const insert = database.prepare(`
      INSERT INTO skill_search_documents (
        skill_id,
        title,
        description,
        slug,
        author_handle,
        repository,
        body,
        tags
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    database.exec("BEGIN");
    try {
      for (const [index, document] of documents.entries()) {
        const bodySize = Math.min(document.size, maxBodyBytes);
        insert.run(
          `skill-${index}`,
          document.title || `Skill ${index}`,
          document.description || "No description",
          `skill-${index}`,
          "sample",
          "skills",
          makeBody(bodySize),
          "sample search",
        );
      }
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }

    database.exec("INSERT INTO skills_fts(skills_fts) VALUES('integrity-check')");
    const pageSize =
      database.query<{ page_size: number }, []>("PRAGMA page_size").get()?.page_size ?? 0;
    const pageCount =
      database.query<{ page_count: number }, []>("PRAGMA page_count").get()?.page_count ?? 0;
    return pageSize * pageCount;
  } finally {
    database.close();
    rmSync(dir, { force: true, recursive: true });
  }
};

const formatMb = (bytes: number) => Math.round((bytes / 1_000_000) * 10) / 10;

const main = async () => {
  const options = parseOptions();
  const corpus = await loadCorpus(options.sqlExportPath);
  const sizes = corpus.entryDocuments.map((document) => document.size);
  const sampledDocuments = corpus.entryDocuments.slice(0, options.sampleSize);
  const safeCeilingBytes = options.headroomRatio * DEFAULT_INTERNAL_CEILING_BYTES;

  const candidateResults = CANDIDATE_BODY_LIMITS.map((bodyLimit) => {
    const measuredBytes = measureFtsBytes(sampledDocuments, bodyLimit);
    const bytesPerDocument = measuredBytes / sampledDocuments.length;
    const projectedSearchBytes = bytesPerDocument * options.plannedSkillCount;
    const projectedTotalBytes = options.currentDbBytes + projectedSearchBytes;
    return {
      bodyLimit,
      bytesPerDocument,
      measuredBytes,
      passesHeadroom: projectedTotalBytes <= safeCeilingBytes,
      projectedSearchBytes,
      projectedTotalBytes,
    };
  });

  const accepted = [...candidateResults].toReversed().find((result) => result.passesHeadroom);

  const result = {
    acceptedMaxIndexableBodyBytes: accepted?.bodyLimit ?? null,
    currentDbBytes: options.currentDbBytes,
    documentsWithEntryFile: corpus.entryDocuments.length,
    internalCeilingBytes: DEFAULT_INTERNAL_CEILING_BYTES,
    languageSamplesFromMetadata: detectSamples(corpus.entryDocuments),
    plannedSkillCount: options.plannedSkillCount,
    privateSkillCount: corpus.privateSkillCount,
    projectedHeadroomBytes: safeCeilingBytes,
    publicSkillCount: corpus.publicSkillCount,
    publicSkillsWithoutEntryFile: corpus.publicSkillsWithoutEntryFile,
    publicSkillsWithoutSnapshot: corpus.publicSkillsWithoutSnapshot,
    sizeBytes: {
      max: Math.max(...sizes),
      p50: percentile(sizes, 50),
      p90: percentile(sizes, 90),
      p95: percentile(sizes, 95),
      p99: percentile(sizes, 99),
      total: sizes.reduce((sum, value) => sum + value, 0),
    },
    largestBodyOutliers: largestBodyOutliers(corpus.entryDocuments),
    storageFixtures: candidateResults.map((fixture) => ({
      bodyLimitBytes: fixture.bodyLimit,
      measuredSampleMb: formatMb(fixture.measuredBytes),
      passesHeadroom: fixture.passesHeadroom,
      projectedSearchMbAtPlannedSkills: formatMb(fixture.projectedSearchBytes),
      projectedTotalMbAtPlannedSkills: formatMb(fixture.projectedTotalBytes),
      sampleBytesPerDocument: Math.round(fixture.bytesPerDocument),
    })),
    totalSkillCount: corpus.totalSkillCount,
  };

  console.log(JSON.stringify(result, null, 2));
};

await main();
