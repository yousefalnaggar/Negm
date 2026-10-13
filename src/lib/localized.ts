type Named = { nameAr: string; nameEn: string };
type Described = { descriptionAr?: string | null; descriptionEn?: string | null };

export function localName(item: Named, locale: string): string {
  return locale === "ar" ? item.nameAr : item.nameEn;
}

/** Falls back to the other language when the active one is empty. */
export function localDescription(item: Described, locale: string): string {
  const [first, second] =
    locale === "ar" ? [item.descriptionAr, item.descriptionEn] : [item.descriptionEn, item.descriptionAr];
  return first?.trim() || second?.trim() || "";
}
