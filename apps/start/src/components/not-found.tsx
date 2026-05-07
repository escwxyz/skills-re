import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "@phosphor-icons/react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const NotFound = () => (
  <div className="flex min-h-[calc(100svh-var(--header-height))] items-center justify-center px-6 py-10">
    <section className="grid w-full max-w-5xl gap-8 border border-border bg-background p-8 md:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {m.error_page_fatal_error_code()}
        </p>
        <div className="mt-4 font-display text-[clamp(72px,13vw,180px)] leading-none font-normal italic">
          404
        </div>
        <h1 className="mt-6 font-serif text-[clamp(28px,4vw,42px)] font-bold italic text-foreground">
          {m.error_404_title()}
        </h1>
        <p className="text-ink-2 mt-3 max-w-2xl font-serif text-[18px] leading-[1.6]">
          {m.error_404_description()}
        </p>
        <div className="mt-8">
          <Link
            className={cn(buttonVariants({ variant: "ghost" }), "w-full px-8 sm:w-auto")}
            to="/"
          >
            <ArrowLeftIcon /> {m.error_page_return_to_origin()}
          </Link>
        </div>
      </div>

      <div className="border-border flex items-end border-t pt-6 md:border-t-0 md:border-l md:pl-8">
        <p className="font-mono text-[11px] leading-[1.8] uppercase tracking-[0.2em] text-muted-foreground">
          {m.error_404_terminal_line_1()}
          <br />
          {m.error_404_terminal_line_2()}
          <br />
          {m.error_404_terminal_line_3()} {m.error_404_terminal_code()}
        </p>
      </div>
    </section>
  </div>
);
