import {
  how_it_works_eyebrow,
  how_it_works_step_1_body,
  how_it_works_step_1_meta,
  how_it_works_step_1_title,
  how_it_works_step_2_body,
  how_it_works_step_2_meta,
  how_it_works_step_2_title,
  how_it_works_step_3_body,
  how_it_works_step_3_meta,
  how_it_works_step_3_title,
  how_it_works_title,
} from "@/paraglide/messages";

const steps = [
  {
    body: how_it_works_step_1_body(),
    meta: how_it_works_step_1_meta(),
    num: "i.",
    title: how_it_works_step_1_title(),
  },
  {
    body: how_it_works_step_2_body(),
    meta: how_it_works_step_2_meta(),
    num: "ii.",
    title: how_it_works_step_2_title(),
  },
  {
    body: how_it_works_step_3_body(),
    meta: how_it_works_step_3_meta(),
    num: "iii.",
    title: how_it_works_step_3_title(),
  },
] as const;

export const HowItWorks = () => (
  <section>
    <div className="section-title">
      <h3>{how_it_works_title()}</h3>
      <div className="eyebrow">{how_it_works_eyebrow()}</div>
    </div>
    <div className="border-border grid grid-cols-1 border-b sm:grid-cols-3">
      {steps.map((step) => (
        <div
          key={step.title}
          className="border-border border-b px-5.5 py-7 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
        >
          <div className="font-display text-muted-foreground-2 text-[72px] leading-none italic">
            {step.num}
          </div>
          <h5 className="font-display mt-2.5 mb-2 text-[28px] leading-[1.05] font-normal">
            {step.title}
          </h5>
          <p className="text-muted-foreground m-0 font-serif text-sm leading-normal">{step.body}</p>
          <div className="border-border text-muted-foreground mt-4.5 border-t pt-3.5 font-mono text-[10.5px] tracking-[.14em] uppercase">
            {step.meta}
          </div>
        </div>
      ))}
    </div>
  </section>
);
