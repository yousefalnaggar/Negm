import { ArrowRight, ChevronDown, MessageCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { ReviewsSlider } from "@/components/reviews-slider";
import { Link } from "@/i18n/navigation";
import { getCategoriesWithCounts, listProducts } from "@/lib/catalog";
import { localName } from "@/lib/localized";
import { mediaUrl } from "@/lib/media";
import { whatsappUrl } from "@/lib/normalize";
import { getSettings } from "@/lib/settings";

// Placeholder logos in public/partners. Swap the files (and names) for real partners.
const PARTNERS = [
  "Orbit Labs", "Pyramid Works", "Hexa Systems", "Kemet Digital", "Atlas Cowork",
  "Nilewave", "Falcon Logistics", "Sahara Games", "Sunrise Bank", "Linkora",
].map((name, i) => ({ name, src: `/partners/${String(i + 1).padStart(2, "0")}.svg` }));

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">
          <span className="h-0.5 w-6 rounded-full bg-accent" />
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h2>
      </div>
      {children}
    </Reveal>
  );
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale as "ar" | "en");
  const [t, categories, featured, settings] = await Promise.all([
    getTranslations("home"),
    getCategoriesWithCounts(),
    listProducts(locale, { featured: true, take: 8 }),
    getSettings(),
  ]);
  const whatsapp = whatsappUrl(settings.phone);
  const reviews = (t.raw("reviews") as { name: string; role: string; text: string }[]).map((r, i) => ({
    ...r,
    photo: `/images/reviews/${i + 1}.webp`,
  }));
  const stats = t.raw("stats") as { value: string; label: string }[];

  return (
    <>
      {/* Hero: full-screen photo under a 70% black overlay */}
      <section className="relative isolate flex min-h-[calc(100svh-5.8rem)] items-center overflow-hidden bg-black py-16 text-white sm:min-h-[max(540px,calc(100svh-5.8rem))] sm:py-24">
        <img
          src="/images/hero.webp"
          width={2400}
          height={1597}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full animate-hero-zoom object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/70" />
        <div className="container-page text-center">
          <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-[0.16em] text-pop uppercase backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-pop" />
            {t("eyebrow")}
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl animate-fade-up font-display text-5xl leading-[1.05] font-bold tracking-tight text-balance [animation-delay:120ms] rtl:leading-[1.3] sm:text-7xl lg:text-8xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg leading-relaxed text-white/80 [animation-delay:240ms] sm:text-xl">
            {t("subtitle")}
          </p>
          <div className="mt-10 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:360ms]">
            <Link href="/shop" className="btn-primary px-7 py-3.5 text-base">
              {t("cta")}
              <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Link>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn border border-white/30 bg-white/10 px-7 py-3.5 text-base text-white backdrop-blur hover:-translate-y-0.5 hover:border-[#25d366] hover:bg-[#25d366] hover:text-black"
            >
              <MessageCircle className="size-4" strokeWidth={2} />
              {t("whatsapp")}
            </a>
          </div>
        </div>
        <a
          href="#favorites"
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-fade-in sm:flex flex-col items-center gap-1 text-xs text-white/60 [animation-delay:800ms] hover:text-white"
        >
          {t("scroll")}
          <ChevronDown className="size-5 animate-float" />
        </a>
      </section>

      {/* Customer favourites */}
      <section id="favorites" className="container-page scroll-mt-24 pt-24">
        <SectionHeading eyebrow={t("favoritesEyebrow")} title={t("featuredTitle")}>
          <Link href="/shop" className="group inline-flex items-center gap-1.5 text-sm font-bold text-accent">
            {t("viewAll")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
        </SectionHeading>
        <ProductGrid products={featured} />
      </section>

      {/* Categories */}
      <section className="container-page pt-28">
        <SectionHeading eyebrow={t("categoriesEyebrow")} title={t("categoriesTitle")} />
        <Reveal stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-3xl bg-black"
            >
              {c.imageKey && (
                <img
                  src={mediaUrl(c.imageKey)!}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover opacity-90 transition-all duration-700 ease-out group-hover:scale-110 group-hover:opacity-100"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute inset-0 rounded-3xl ring-0 ring-pop transition-all duration-300 ring-inset group-hover:ring-4" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                <div className="transition-transform duration-300 group-hover:-translate-y-1">
                  <p className="text-xs font-bold tracking-wide text-pop">{t("productCount", { count: c._count.products })}</p>
                  <h3 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{localName(c, locale)}</h3>
                </div>
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black transition-all duration-300 group-hover:-rotate-45 group-hover:bg-pop rtl:group-hover:rotate-45">
                  <ArrowRight className="size-5 rtl:-scale-x-100" />
                </span>
              </div>
            </Link>
          ))}
        </Reveal>
      </section>

      {/* Trusted partners */}
      <section className="mt-28 overflow-hidden border-y border-line bg-surface py-16">
        <Reveal className="container-page text-center">
          <p className="eyebrow">{t("partnersEyebrow")}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("partnersTitle")}</h2>
        </Reveal>
        <div
          dir="ltr"
          className="group relative mt-12 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
        >
          <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
            {[...PARTNERS, ...PARTNERS].map((p, i) => (
              <img
                key={i}
                src={p.src}
                alt={i < PARTNERS.length ? p.name : ""}
                aria-hidden={i >= PARTNERS.length || undefined}
                className="mr-16 h-9 w-auto opacity-50 transition-all duration-300 hover:scale-110 hover:opacity-100 dark:invert"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="container-page pt-28">
        <SectionHeading eyebrow={t("reviewsEyebrow")} title={t("reviewsTitle")} />
        <Reveal>
          <ReviewsSlider reviews={reviews} />
        </Reveal>
      </section>

      {/* About */}
      <section className="container-page pt-28">
        <Reveal className="grid items-center gap-10 overflow-hidden rounded-[2rem] bg-[#0e1117] p-6 text-white sm:p-10 lg:grid-cols-2 lg:p-14 dark:border dark:border-line dark:bg-surface">
          <div>
            <p className="eyebrow text-pop!">{t("aboutEyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("aboutTitle")}</h2>
            <p className="mt-4 leading-relaxed text-white/70 dark:text-muted">{t("aboutText")}</p>
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col-reverse">
                  <dt className="text-xs text-white/60 dark:text-muted">{s.label}</dt>
                  <dd className="font-display text-2xl font-bold whitespace-nowrap text-pop sm:text-3xl">{s.value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/about" className="btn-pop mt-8 px-6 py-3">
              {t("aboutCta")}
              <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <img
              src="/images/about.webp"
              width={1400}
              height={933}
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
        </Reveal>
      </section>
    </>
  );
}
