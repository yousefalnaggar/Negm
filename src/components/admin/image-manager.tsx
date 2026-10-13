"use client";

import { ArrowLeft, ArrowRight, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { deleteProductImage, moveProductImage, uploadProductImage } from "@/actions/admin";

type ErrorKey = Parameters<ReturnType<typeof useTranslations<"errors">>>[0];

export function ImageManager({ productId, images }: { productId: string; images: { id: string; url: string }[] }) {
  const t = useTranslations("admin.productsPage");
  const tErr = useTranslations("errors");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // One request per file keeps each upload under the body-size limit.
  const upload = (files: FileList) =>
    start(async () => {
      setError(null);
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", file);
        const res = await uploadProductImage(productId, fd);
        if (res.error) {
          setError(tErr(res.error as ErrorKey));
          break;
        }
      }
      if (input.current) input.current.value = "";
    });

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("images")}</h2>
          <p className="text-xs text-muted">{t("imagesHint")}</p>
        </div>
        <label className={`btn-outline cursor-pointer ${pending || images.length >= 10 ? "pointer-events-none opacity-50" : ""}`}>
          <Upload className="size-4" /> {pending ? t("uploading") : t("upload")}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => e.target.files?.length && upload(e.target.files)}
          />
        </label>
      </div>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      <ul className={`grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 ${pending ? "opacity-60" : ""}`}>
        {images.map((img, i) => (
          <li key={img.id} className={`group relative overflow-hidden rounded-xl bg-sunken ${i === 0 ? "ring-2 ring-accent" : ""}`}>
            <img src={img.url} alt="" className="aspect-square w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 text-white">
              <button type="button" disabled={pending || i === 0} onClick={() => start(() => moveProductImage(img.id, -1))} className="grid size-7 place-items-center rounded disabled:opacity-30" aria-label={t("moveUp")}>
                <ArrowLeft className="size-4 rtl:-scale-x-100" />
              </button>
              <button type="button" disabled={pending} onClick={() => start(() => deleteProductImage(img.id))} className="grid size-7 place-items-center rounded hover:bg-white/20" aria-label={t("removeImage")}>
                <Trash2 className="size-4" />
              </button>
              <button type="button" disabled={pending || i === images.length - 1} onClick={() => start(() => moveProductImage(img.id, 1))} className="grid size-7 place-items-center rounded disabled:opacity-30" aria-label={t("moveDown")}>
                <ArrowRight className="size-4 rtl:-scale-x-100" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
