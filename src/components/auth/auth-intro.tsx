import type { ReactNode } from "react";

export interface AuthIntroProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
}

export function AuthIntro({ eyebrow, title, description }: AuthIntroProps) {
  return (
    <div className="mb-8 border-t-2 border-clay pt-6">
      <p className="eyebrow text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl leading-[1.02] font-medium tracking-[-0.035em] text-balance sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
