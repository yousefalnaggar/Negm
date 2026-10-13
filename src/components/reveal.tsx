"use client";

import { useEffect, useRef } from "react";

/**
 * Fades its content up when it scrolls into view (see [data-reveal] in globals.css).
 * With `stagger`, direct children animate one after another.
 */
export function Reveal({
  children,
  className,
  stagger = false,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  as?: "div" | "section" | "ul" | "ol";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as never} data-reveal="" data-stagger={stagger ? "" : undefined} className={className}>
      {children}
    </Tag>
  );
}
