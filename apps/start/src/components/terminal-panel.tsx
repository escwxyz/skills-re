export const TerminalPanel = () => (
  <section className="my-8 overflow-hidden border border-border bg-foreground text-background">
    <div className="flex items-center justify-between border-b border-background/15 px-4 py-2 font-mono text-[10.5px] tracking-[.14em] uppercase text-background/70">
      <span>guest@skills.re ~ %</span>
      <span>install a skill in seconds</span>
    </div>
    <pre className="overflow-x-auto px-4 py-5 font-mono text-[11px] leading-6 text-background/85">
      <span className="text-background/60">
        # install a skill from the registry into your Claude Code agent
      </span>
      {"\n"}
      <span className="text-background/90">$</span>{" "}
      <span className="text-background">skills-re install</span>{" "}
      <span className="text-background/75">code-review</span>{" "}
      <span className="text-background/60">--agent claude</span>
      {"\n"}
      <span className="text-background/60">
        Installed code-review@2.4.1 to .claude/skills/code-review
      </span>
      {"\n"}
      <span className="text-background/90">$</span>{" "}
      <span className="text-background">skills-re sync</span>{" "}
      <span className="text-background/60">--agent claude</span>
      {"\n"}
      <span className="text-background/60">Synced 1 skill to CLAUDE.md</span>
      {"\n"}
      <span className="text-background/90">$</span>{" "}
      <span className="inline-block align-middle text-background animate-pulse">▍</span>
    </pre>
  </section>
);
