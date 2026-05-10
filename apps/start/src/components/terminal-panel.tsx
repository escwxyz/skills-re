export const TerminalPanel = () => (
  <section className="my-8 overflow-hidden border border-border bg-foreground text-background">
    <div className="flex items-center justify-between border-b border-background/15 px-4 py-2 font-mono text-[10.5px] tracking-[.14em] uppercase text-background/70">
      <span>guest@skills.re ~ %</span>
      <span>install a skill in one line</span>
    </div>
    <pre className="overflow-x-auto px-4 py-5 font-mono text-[11px] leading-6 text-background/85">
      <span className="text-background/60">
        # fetch a skill from the registry and mount it into your agent
      </span>
      {"\n"}
      <span className="text-background/90">$</span>{" "}
      <span className="text-background">skr install</span>{" "}
      <span className="text-background/75">code-review@2.4.1</span>{" "}
      <span className="text-background/60">--to ./skills</span>
      {"\n"}
      <span className="text-background/60">→ resolving code-review@2.4.1 </span>
      <span>[ok]</span>
      {"\n"}
      <span className="text-background/60">→ verifying sha256 fingerprint </span>
      <span>[ok]</span>
      {"\n"}
      <span className="text-background/60">→ running acceptance evals </span>
      <span>[21/21 passed]</span>
      {"\n"}
      <span className="text-background/60">→ mounted at ./skills/code-review </span>
      {"\n"}
      <span className="text-background/90">$</span>{" "}
      <span className="text-background">claude run</span>{" "}
      <span className="text-background/75">--skill code-review</span>{" "}
      <span className="text-background/75">./src</span>
      <span className="inline-block align-middle text-background animate-pulse">▍</span>
    </pre>
  </section>
);
