"use client";

import { useState } from "react";

type Img = { url: string; width: number; height: number };

export function Gallery({ images, alt }: { images: Img[]; alt: string }) {
  const [active, setActive] = useState(0);
  const main = images[active];
  if (!main) return <div className="aspect-square rounded-3xl bg-sunken" />;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl bg-sunken">
        <img
          src={main.url}
          width={main.width}
          height={main.height}
          alt={alt}
          fetchPriority="high"
          className="aspect-square w-full object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              className={`size-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"}`}
              aria-label={`${alt} ${i + 1}`}
              aria-current={i === active}
            >
              <img src={img.url} alt="" loading="lazy" className="size-full bg-sunken object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
