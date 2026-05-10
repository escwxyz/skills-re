import {
  blog_section_body,
  blog_section_corrections,
  blog_section_corrections_body,
  blog_section_eyebrow,
  blog_section_filed,
  blog_section_next_body,
  blog_section_next_week,
} from "@/paraglide/messages";

export const BlogSection = () => (
  <section className="grid grid-cols-1 gap-8 border-b border-border py-10 md:grid-cols-[1fr_2fr_1fr]">
    <aside className="border-b border-border pb-6 pr-3 font-mono text-[11px] leading-[1.6] tracking-wider text-muted-foreground md:border-b-0 md:pb-0">
      <span className="mb-1.5 block tracking-[.16em] uppercase text-foreground">
        {blog_section_eyebrow()}
      </span>
      {blog_section_body()}
      <br />
      <br />- <b>{blog_section_filed()}</b>
    </aside>

    <div className="font-serif text-[18px] leading-[1.55]">
      <p className="dropcap mt-0">
        The appeal of a registry - any registry - is that it forgets nothing. That is also its
        burden. We are not, in the end, in the business of cataloguing software. We are in the
        business of cataloguing <em>intent</em>: the small, often embarrassing instructions we hand
        to a model to get it to behave, expressed in a form durable enough to share.
      </p>
      <p className="indent-[1.2em] m-0">
        A skill on skills.re is a folder. It contains a{" "}
        <span className="font-mono text-[.85em]">skill.md</span> (what to do, when, and with what
        care), optional scaffolding, an eval harness, and a signature. That is all, and it is on
        purpose. The registry&apos;s job is to make those folders legible, searchable, reviewable,
        and - this is the part the good registries get right - <em>auditable at a glance.</em>
      </p>
      <p className="indent-[1.2em] m-0">
        We think of every page here as a tool for a specific decision:{" "}
        <em>is this the right skill for what I&apos;m about to do?</em> If the page answers that
        question honestly, in under ninety seconds, we consider it well designed.
      </p>
    </div>

    <aside className="border-t border-border pt-6 pl-0 font-mono text-[11px] leading-[1.6] tracking-wider text-muted-foreground md:border-t-0 md:border-l md:pt-0 md:pl-3.5">
      <span className="mb-1.5 block tracking-[.16em] uppercase text-foreground">
        {blog_section_corrections()}
      </span>
      {blog_section_corrections_body()}
      <br />
      <br />
      <span className="mb-1.5 block tracking-[.16em] uppercase text-foreground">
        {blog_section_next_week()}
      </span>
      {blog_section_next_body()}
    </aside>
  </section>
);
