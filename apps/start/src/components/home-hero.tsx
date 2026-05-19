import { Link } from "@tanstack/react-router";

import { AgentLogoCloud } from "@/components/agent-logo-cloud";
import { NewsletterForm } from "@/components/newsletter-form";
import {
  home_hero_a_practice,
  home_hero_a_skill_is_an,
  home_hero_browse_index,
  home_hero_description,
  home_hero_instruction,
  home_hero_leading,
  home_hero_newsletter_circulation,
  home_hero_newsletter_frequency,
  home_hero_newsletter_join,
  home_hero_newsletter_signal,
  home_hero_newsletter_terms_prefix,
  home_hero_newsletter_vol,
  home_hero_not_a_package,
  home_hero_not_an_install,
  home_hero_publish_skill,
  login_dialog_and,
  login_dialog_privacy_policy,
  login_dialog_terms,
} from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";

export const HomeHero = () => (
  <section className="border-border grid grid-cols-1 gap-8 border-b py-6 md:grid-cols-[3fr_2fr]">
    <div className="border-border border-b pb-8 md:border-r md:border-b-0 md:pr-8 md:pb-0">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="bg-destructive inline-block h-2 w-2 rounded-full" />
        <span className="text-destructive font-mono text-[10.5px] tracking-[.2em] uppercase">
          {home_hero_leading()}
        </span>
      </div>
      <h2 className="font-display my-1 mb-4 text-[clamp(40px,6vw,74px)] leading-[.94] font-normal tracking-[-0.015em]">
        {home_hero_not_a_package()}
        <em>{home_hero_a_practice()}</em>
        <br />
        {home_hero_a_skill_is_an()}
        <em>{home_hero_instruction()}</em>
        {home_hero_not_an_install()}
      </h2>
      <p className="text-muted-foreground mb-5 max-w-155 font-serif text-[20px] leading-[1.4]">
        {home_hero_description()}
      </p>
      <div className="mt-4.5 mb-2.5 flex flex-wrap gap-3">
        <Link className={cn(buttonVariants({ size: "lg", variant: "default" }))} to="/skills">
          {home_hero_browse_index()}
        </Link>
        <Link className={cn(buttonVariants({ size: "lg", variant: "secondary" }))} to="/submit">
          {home_hero_publish_skill()}
        </Link>
      </div>
    </div>

    <div className="grid content-start gap-5 pl-0 md:pl-2">
      <div>
        <span className="text-muted-foreground font-mono text-[10.5px] tracking-[.14em]">[01]</span>
        <p className="text-muted-foreground mt-1.5 font-serif text-[13.5px] leading-normal italic">
          {home_hero_newsletter_signal()}
        </p>
      </div>

      <div className="text-muted-foreground/60 font-mono text-[10px] tracking-[.12em] uppercase">
        {home_hero_newsletter_vol()}
      </div>

      <hr className="border-border" />

      <div>
        <div className="text-muted-foreground mb-3 font-mono text-[10.5px] tracking-[.2em] uppercase">
          {home_hero_newsletter_circulation()}
        </div>
        <h3 className="font-display mb-4 text-[28px] leading-[1.05] font-normal tracking-[-0.01em]">
          {home_hero_newsletter_join()}
        </h3>
        <NewsletterForm />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
        <div>
          <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[.12em]">
            [02]
          </span>
          <p className="text-muted-foreground mt-1 font-serif text-[12px] leading-[1.4] italic">
            {home_hero_newsletter_frequency()}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[.12em]">
            [03]
          </span>
          <p className="text-muted-foreground mt-1 font-serif text-[12px] leading-[1.4] italic">
            {home_hero_newsletter_terms_prefix()}{" "}
            <Link to="/terms" className="underline underline-offset-2">
              {login_dialog_terms()}
            </Link>{" "}
            {login_dialog_and()}{" "}
            <Link to="/privacy" className="underline underline-offset-2">
              {login_dialog_privacy_policy()}
            </Link>
            .
          </p>
        </div>
      </div>

      <AgentLogoCloud />
    </div>
  </section>
);
