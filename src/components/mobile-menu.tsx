"use client";

import { Menu, MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, usePathname } from "@/i18n/navigation";

type NavLink = { href: string; label: string };

export function MobileMenu({ links, whatsapp }: { links: NavLink[]; whatsapp: NavLink }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");

  // Close when navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ms-2 grid size-10 shrink-0 place-items-center rounded-full text-ink hover:bg-sunken lg:hidden"
        aria-label={t("menu")}
        aria-expanded={open}
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </button>

      {/* Portaled to <body>: the header's backdrop-blur would otherwise trap this
          fixed overlay inside the header's own box. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("menu")}>
            <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 start-0 flex w-[85%] max-w-sm animate-drawer-in flex-col bg-bg shadow-2xl rtl:[--drawer-from:100%]">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
                <span className="text-sm font-semibold text-muted">{t("menu")}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-10 place-items-center rounded-full text-ink hover:bg-sunken"
                  aria-label={t("close")}
                  autoFocus
                >
                  <X className="size-5" strokeWidth={1.75} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-2 py-4">
                {links.map((l, i) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    style={{ animationDelay: `${80 + i * 50}ms` }}
                    className={`block animate-fade-up rounded-xl px-3 py-3 font-display text-xl font-bold hover:bg-sunken ${pathname === l.href ? "text-accent" : "text-ink"}`}
                  >
                    {l.label}
                  </Link>
                ))}
                <a
                  href={whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ animationDelay: `${80 + links.length * 50}ms` }}
                  className="mt-4 flex animate-fade-up items-center gap-2 rounded-xl bg-[#25d366]/12 px-3 py-3 font-semibold text-[#128c4a] dark:text-[#4ade80]"
                >
                  <MessageCircle className="size-5" strokeWidth={2} />
                  {whatsapp.label}
                </a>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
