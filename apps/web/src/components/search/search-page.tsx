"use client";

import { useState, useMemo } from "react";

type ResultType = "skill" | "collection" | "author";
type FilterType = "all" | "skills" | "collections" | "authors";

interface SearchResult {
  idx: string;
  type: ResultType;
  id: string;
  version: string;
  author: string;
  title: string;
  titleHtml: string;
  desc: string;
  snippet?: string;
  tags: string[];
  score: number;
  pass: string;
  installs: string;
  href: string;
}

const MOCK_RESULTS: SearchResult[] = [
  {
    idx: "01.",
    type: "skill",
    id: "CR-44",
    version: "2.4.1",
    author: "Core Systems Div.",
    title: "code-review",
    titleHtml: "code-<em>review</em>",
    desc: "A diff-first reviewer for pull requests. Reads the diff slowly, in order, and returns a small number of specific, anchored suggestions.",
    snippet:
      '<b>skill.md § 02</b> &nbsp;→&nbsp; "...prefers one high-leverage question over five small nits. Quotes the specific line it\'s worried about — always..."',
    tags: ["review", "diff", "ci"],
    score: 98.4,
    pass: "99.8%",
    installs: "412k",
    href: "/skills/code-review",
  },
  {
    idx: "02.",
    type: "skill",
    id: "CR-77",
    version: "1.1.2",
    author: "@pr-people",
    title: "pr-triage",
    titleHtml: "pr-triage",
    desc: "Prioritizes a queue of pull requests by risk, freshness, and reviewer load. Pairs with code-review for a one-two punch on Monday morning.",
    snippet:
      '<b>README § usage</b> &nbsp;→&nbsp; "...invoke pr-triage before code-review so the reviewer sees diffs in the right order..."',
    tags: ["pr", "triage", "queue"],
    score: 92.1,
    pass: "97.2%",
    installs: "76k",
    href: "/skills/code-review",
  },
  {
    idx: "03.",
    type: "skill",
    id: "CR-12",
    version: "0.9.1",
    author: "@coverage-club",
    title: "test-gap-finder",
    titleHtml: "test-gap-finder",
    desc: "Compares coverage against behavior. Points at untested branches in plain English — often used after a pull request review.",
    snippet:
      '<b>example.yaml</b> &nbsp;→&nbsp; "...chain with code-review via <code>--after</code> to extend the review onto untested paths..."',
    tags: ["tests", "coverage"],
    score: 87.3,
    pass: "95.0%",
    installs: "118k",
    href: "/skills/test-gap-finder",
  },
  {
    idx: "04.",
    type: "collection",
    id: "COL-01",
    version: "",
    author: "@hallie",
    title: "A Monday for the code-reviewer.",
    titleHtml: "A Monday for the code-<em>reviewer.</em>",
    desc: "A stack of skills we reach for on the first morning of a sprint, when the pull request queue is long and the context is thin. Fourteen skills, one Monday.",
    tags: ["collection", "monday", "triage"],
    score: 84,
    pass: "",
    installs: "2.4M",
    href: "/collections/monday-for-code-reviewer",
  },
  {
    idx: "05.",
    type: "skill",
    id: "CR-19",
    version: "1.0.0",
    author: "Core Systems Div.",
    title: "migration-scout",
    titleHtml: "migration-scout",
    desc: "Finds the bodies before they bury you. Flags breaking changes in transitive deps as part of a review.",
    tags: ["deps", "migration"],
    score: 72.8,
    pass: "98.3%",
    installs: "82k",
    href: "/skills/code-review",
  },
  {
    idx: "06.",
    type: "author",
    id: "PUB",
    version: "",
    author: "@hallie · 18 skills",
    title: "@hallie — platform engineering",
    titleHtml: "@hallie — <em>platform engineering</em>",
    desc: "Publishes skills that are small, opinionated, and tuned for the pull request queue you actually have on a Monday morning.",
    tags: ["author", "verified"],
    score: 68.2,
    pass: "",
    installs: "1.2M",
    href: "/authors/hallie",
  },
  {
    idx: "07.",
    type: "skill",
    id: "WR-45",
    version: "2.0.1",
    author: "@atlantic",
    title: "release-notes",
    titleHtml: "release-notes",
    desc: "Turns a commit range — or a batch of recently-merged pull requests — into honest, scannable release notes grouped by impact.",
    tags: ["writing", "release"],
    score: 62.4,
    pass: "97.0%",
    installs: "38k",
    href: "/skills/code-review",
  },
];

const RELATED_TAGS = [
  "pull-request",
  "code-review",
  "diff",
  "github",
  "ci",
  "triage",
  "monorepo",
  "approval",
  "blameless",
];

export default function SearchPage({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<FilterType>("all");

  const typeMap: Record<Exclude<FilterType, "all">, ResultType> = {
    skills: "skill",
    collections: "collection",
    authors: "author",
  };

  const filtered = useMemo(() => {
    let results = MOCK_RESULTS;
    if (filter !== "all") {
      results = results.filter((r) => r.type === typeMap[filter]);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (r) => r.title.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q),
      );
    }
    return results;
  }, [query, filter]);

  const counts = useMemo(
    () => ({
      all: MOCK_RESULTS.length,
      skills: MOCK_RESULTS.filter((r) => r.type === "skill").length,
      collections: MOCK_RESULTS.filter((r) => r.type === "collection").length,
      authors: MOCK_RESULTS.filter((r) => r.type === "author").length,
    }),
    [],
  );

  const chips: { id: FilterType; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "skills", label: "Skills", count: counts.skills },
    { id: "collections", label: "Collections", count: counts.collections },
    { id: "authors", label: "Authors", count: counts.authors },
  ];

  return (
    <div>
      {/* HERO */}
      <section
        style={{
          padding: "40px 24px 30px",
          borderBottom: "1px solid var(--rule)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "32px",
          alignItems: "end",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "var(--editorial-red)",
              marginBottom: "12px",
            }}
          >
            § Search · Semantic + Keyword
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "68px",
              lineHeight: ".95",
              fontWeight: 400,
              margin: 0,
              letterSpacing: "-.02em",
            }}
          >
            Results for{" "}
            <em style={{ fontStyle: "italic", color: "var(--editorial-red)" }}>"{query || "…"}"</em>
          </h1>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            textAlign: "right",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--muted-text)",
            lineHeight: 2,
          }}
        >
          Matches <b style={{ color: "var(--ink)" }}>{filtered.length}</b>
          <br />
          Skills <b style={{ color: "var(--ink)" }}>{counts.skills}</b> · Collections{" "}
          <b style={{ color: "var(--ink)" }}>{counts.collections}</b> · Authors{" "}
          <b style={{ color: "var(--ink)" }}>{counts.authors}</b>
        </div>
      </section>

      {/* SEARCH BAR */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              padding: "18px 0 18px 24px",
              fontFamily: "var(--font-mono)",
              color: "var(--editorial-red)",
              fontSize: "18px",
            }}
          >
            ›
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search skills, collections, authors…"
            style={{
              border: 0,
              padding: "18px 12px",
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              background: "transparent",
              letterSpacing: "-.01em",
              flex: 1,
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>
        <span
          style={{
            padding: "0 24px",
            fontFamily: "var(--font-mono)",
            fontSize: "10.5px",
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--muted-text)",
            alignSelf: "center",
          }}
        >
          <span
            style={{
              border: "1px solid var(--rule)",
              padding: "2px 6px",
              fontSize: "11px",
            }}
          >
            ⌘
          </span>{" "}
          +{" "}
          <span
            style={{
              border: "1px solid var(--rule)",
              padding: "2px 6px",
              fontSize: "11px",
            }}
          >
            K
          </span>
        </span>
        <button
          style={{
            border: 0,
            borderLeft: "1px solid var(--rule)",
            background: "var(--ink)",
            color: "var(--paper)",
            padding: "0 24px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: ".14em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Search →
        </button>
      </div>

      {/* FILTER CHIPS */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--rule)",
          overflowX: "auto",
        }}
      >
        {chips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFilter(chip.id)}
            style={{
              padding: "12px 18px",
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: filter === chip.id ? "var(--paper)" : "var(--muted-text)",
              background: filter === chip.id ? "var(--ink)" : "transparent",
              border: 0,
              borderRight: "1px solid var(--rule)",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            {chip.label}{" "}
            <b
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "14px",
                fontWeight: 400,
                letterSpacing: 0,
                textTransform: "none",
                marginLeft: "6px",
                color: filter === chip.id ? "#fff" : "var(--editorial-red)",
              }}
            >
              {chip.count}
            </b>
          </button>
        ))}
        <span
          style={{
            marginLeft: "auto",
            padding: "12px 24px",
            fontFamily: "var(--font-mono)",
            fontSize: "10.5px",
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--muted-text)",
            alignSelf: "center",
            borderLeft: "1px solid var(--rule)",
            cursor: "pointer",
          }}
        >
          § Sort: relevance ▾
        </span>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        {/* RESULTS */}
        <div style={{ borderRight: "1px solid var(--rule)" }}>
          {filtered.map((result, i) => (
            <a
              key={i}
              href={result.href}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 180px",
                gap: "20px",
                padding: "26px 24px",
                borderBottom: "1px solid var(--rule)",
                color: "inherit",
                alignItems: "start",
                textDecoration: "none",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "var(--paper-2)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "52px",
                  lineHeight: 1,
                  color: "var(--muted-text-2)",
                }}
              >
                {result.idx}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10.5px",
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "var(--muted-text)",
                  }}
                >
                  {result.type.toUpperCase()} · {result.id}
                  {result.version ? ` · v.${result.version}` : ""} · {result.author.toUpperCase()}
                </div>
                <h4
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "32px",
                    fontWeight: 400,
                    lineHeight: 1.05,
                    margin: "6px 0 8px",
                  }}
                  dangerouslySetInnerHTML={{ __html: result.titleHtml }}
                />
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "15px",
                    color: "var(--ink-2)",
                    lineHeight: 1.5,
                    maxWidth: "680px",
                    margin: "0 0 10px",
                  }}
                >
                  {result.desc}
                </p>
                {result.snippet && (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "var(--ink-2)",
                      background: "var(--paper-2)",
                      borderLeft: "3px solid var(--editorial-red)",
                      padding: "10px 14px",
                      marginTop: "8px",
                      maxWidth: "680px",
                      lineHeight: 1.5,
                    }}
                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                  />
                )}
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "5px",
                  }}
                >
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        padding: "3px 7px",
                        border: "1px solid var(--rule)",
                        color: "var(--ink)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10.5px",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--muted-text)",
                  lineHeight: 1.9,
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "28px",
                    color: "var(--editorial-red)",
                    fontStyle: "italic",
                  }}
                >
                  {result.score}
                </div>
                <div>MATCH SCORE</div>
                <br />
                {result.pass && (
                  <div>
                    PASS
                    <b
                      style={{
                        color: "var(--ink)",
                        fontWeight: 500,
                        display: "block",
                        fontSize: "13px",
                        fontFamily: "var(--font-display)",
                        letterSpacing: 0,
                        textTransform: "none",
                      }}
                    >
                      {result.pass}
                    </b>
                  </div>
                )}
                <div>
                  INST
                  <b
                    style={{
                      color: "var(--ink)",
                      fontWeight: 500,
                      display: "block",
                      fontSize: "13px",
                      fontFamily: "var(--font-display)",
                      letterSpacing: 0,
                      textTransform: "none",
                    }}
                  >
                    {result.installs}
                  </b>
                </div>
              </div>
            </a>
          ))}

          <div style={{ padding: "30px 24px 40px", textAlign: "center" }}>
            <button
              style={{
                border: "1px solid var(--rule)",
                background: "transparent",
                color: "var(--ink)",
                padding: "12px 28px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Load more results →
            </button>
          </div>
        </div>

        {/* SIDEBAR RAIL */}
        <aside style={{ padding: "30px 24px", background: "var(--paper-2)" }}>
          <div
            style={{
              padding: "18px",
              background: "var(--paper)",
              border: "1px solid var(--rule)",
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "15px",
                marginBottom: "6px",
                color: "var(--ink-2)",
              }}
            >
              Did you mean…
            </div>
            <a
              href="#"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "22px",
                fontStyle: "italic",
                color: "var(--ink)",
              }}
            >
              review a diff
            </a>
            <div
              style={{
                marginTop: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--muted-text)",
              }}
            >
              ↳ 412 matches · 24% faster index
            </div>
          </div>

          <h4
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--muted-text)",
              margin: "0 0 14px",
            }}
          >
            Related tags
          </h4>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginBottom: "28px",
            }}
          >
            {RELATED_TAGS.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  padding: "3px 7px",
                  border: "1px solid var(--rule)",
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <h4
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--muted-text)",
              margin: "0 0 14px",
            }}
          >
            Related collections
          </h4>
          {[
            {
              id: "monday-for-code-reviewer",
              num: "01",
              count: 14,
              title: "A Monday for the code-reviewer.",
              desc: "The Monday morning stack.",
            },
            {
              id: "postmortem-kit",
              num: "04",
              count: 7,
              title: "Postmortem kit.",
              desc: "Read a flame graph, write the writeup.",
            },
          ].map((col) => (
            <a
              key={col.id}
              href={`/collections/${col.id}`}
              style={{
                padding: "18px",
                background: "var(--paper)",
                border: "1px solid var(--rule)",
                marginBottom: "14px",
                color: "inherit",
                display: "block",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--ink)";
                (e.currentTarget as HTMLElement).style.color = "var(--paper)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--paper)";
                (e.currentTarget as HTMLElement).style.color = "inherit";
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "var(--muted-text)",
                }}
              >
                COLL. {col.num} · {col.count} SKILLS
              </div>
              <h5
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
                  fontStyle: "italic",
                  fontWeight: 400,
                  margin: "6px 0 4px",
                }}
              >
                {col.title}
              </h5>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "12.5px",
                  margin: 0,
                  color: "var(--ink-2)",
                }}
              >
                {col.desc}
              </p>
            </a>
          ))}

          <h4
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--muted-text)",
              margin: "28px 0 14px",
            }}
          >
            Operators
          </h4>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              lineHeight: 2,
              color: "var(--ink-2)",
            }}
          >
            {[
              ["tag:review", "limit by tag"],
              ["author:hallie", "by author"],
              ["pass:>98", "min pass rate"],
              ["lic:MIT", "license"],
              ["runtime:node", "runtime filter"],
            ].map(([op, desc]) => (
              <div key={op}>
                <b style={{ color: "var(--ink)" }}>{op}</b> — {desc}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
