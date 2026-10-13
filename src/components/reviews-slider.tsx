"use client";

import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Review = { name: string; role: string; text: string; photo: string };

/** One review at a time; advances every 6 s and pauses while hovered or focused. */
export function ReviewsSlider({ reviews }: { reviews: Review[] }) {
  const t = useTranslations("home");
  const rtl = useLocale() === "ar";
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = reviews.length;
  const go = (i: number) => setIndex((i + count) % count);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(id);
  }, [paused, count]);

  const arrow = "grid size-12 place-items-center rounded-full border border-line bg-surface text-ink transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-on-accent";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-[2rem] border border-line bg-surface">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${(rtl ? 1 : -1) * index * 100}%)` }}
        >
          {reviews.map((r, i) => (
            <figure
              key={r.name}
              className="grid w-full shrink-0 md:grid-cols-2"
              aria-hidden={i !== index}
              inert={i !== index}
            >
              <div className="relative aspect-[4/3] overflow-hidden md:aspect-auto md:min-h-[420px]">
                <img
                  src={r.photo}
                  alt=""
                  loading="lazy"
                  className={`absolute inset-0 size-full object-cover transition-transform duration-[1.5s] ease-out ${i === index ? "scale-100" : "scale-110"}`}
                />
              </div>
              <div className="flex flex-col justify-center gap-6 p-7 sm:p-12">
                <Quote className="size-10 text-accent rtl:-scale-x-100" strokeWidth={1.5} />
                <div className="flex gap-1 text-[#f5b301]" aria-label="5/5">
                  {Array.from({ length: 5 }, (_, s) => (
                    <Star key={s} className="size-4 fill-current" />
                  ))}
                </div>
                <blockquote className="font-display text-xl leading-snug font-semibold sm:text-2xl">{r.text}</blockquote>
                <figcaption>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-sm text-muted">{r.role}</p>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {reviews.map((r, i) => (
            <button
              key={r.name}
              type="button"
              onClick={() => go(i)}
              aria-label={t("goTo", { n: i + 1 })}
              aria-current={i === index}
              className={`h-2.5 rounded-full transition-all duration-500 ${i === index ? "w-10 bg-accent" : "w-2.5 bg-line hover:bg-muted"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => go(index - 1)} className={arrow} aria-label={t("prev")}>
            <ChevronLeft className="size-5 rtl:-scale-x-100" />
          </button>
          <button type="button" onClick={() => go(index + 1)} className={arrow} aria-label={t("next")}>
            <ChevronRight className="size-5 rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    </div>
  );
}
