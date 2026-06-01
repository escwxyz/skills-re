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
  how_it_works_step_4_body,
  how_it_works_step_4_meta,
  how_it_works_step_4_title,
  how_it_works_step_5_body,
  how_it_works_step_5_meta,
  how_it_works_step_5_title,
  how_it_works_title,
} from "@/paraglide/messages";

export const HowItWorks = () => {
  const features = [
    {
      num: "01",
      title: how_it_works_step_1_title(),
      body: how_it_works_step_1_body(),
      meta: how_it_works_step_1_meta(),
      col: "sm:col-span-2",
      titleSize: "text-5xl sm:text-6xl",
    },
    {
      num: "02",
      title: how_it_works_step_2_title(),
      body: how_it_works_step_2_body(),
      meta: how_it_works_step_2_meta(),
      col: "sm:col-span-1",
      titleSize: "text-5xl",
    },
    {
      num: "03",
      title: how_it_works_step_3_title(),
      body: how_it_works_step_3_body(),
      meta: how_it_works_step_3_meta(),
      col: "sm:col-span-1",
      titleSize: "text-5xl",
    },
    {
      num: "04",
      title: how_it_works_step_4_title(),
      body: how_it_works_step_4_body(),
      meta: how_it_works_step_4_meta(),
      col: "sm:col-span-2",
      titleSize: "text-5xl sm:text-6xl",
    },
    {
      num: "05",
      title: how_it_works_step_5_title(),
      body: how_it_works_step_5_body(),
      meta: how_it_works_step_5_meta(),
      col: "sm:col-span-3",
      titleSize: "text-5xl sm:text-6xl",
    },
  ];

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 py-3">
        <h3 className="font-display m-0 font-semibold text-4xl">{how_it_works_title()}</h3>
        <div className="font-mono text-xs uppercase text-muted-foreground">
          {how_it_works_eyebrow()}
        </div>
      </div>
      <div className="bg-border border-border grid grid-cols-1 gap-px border-b sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.num}
            className={`bg-background flex min-h-56 flex-col px-5.5 py-6 ${feature.col}`}
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="font-mono text-muted-foreground text-xs tracking-widest">
                {feature.num}
              </span>
              <span className="font-mono text-muted-foreground/60 text-[10px] uppercase tracking-[.14em]">
                {feature.meta}
              </span>
            </div>
            <h4 className={`font-display mb-auto pb-5 leading-[1.05] ${feature.titleSize}`}>
              {feature.title}
            </h4>
            <p className="font-mono text-muted-foreground text-[10.5px] uppercase leading-relaxed tracking-[.08em]">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
