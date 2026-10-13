import { Reveal } from "./reveal";

export function ContentPage({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <article className="container-page max-w-3xl pt-12 sm:pt-20">
      <h1 className="animate-fade-up font-display text-5xl font-bold tracking-tight sm:text-6xl">{title}</h1>
      <p className="mt-6 animate-fade-up font-display text-xl leading-relaxed text-muted [animation-delay:120ms] sm:text-2xl">{lead}</p>
      <Reveal stagger className="mt-12 space-y-6 border-t border-line pt-10 leading-relaxed">
        {children}
      </Reveal>
    </article>
  );
}
