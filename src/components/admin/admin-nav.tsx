"use client";

import { LayoutDashboard, Package, Receipt, Settings, Tags, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", key: "orders", icon: Receipt },
  { href: "/admin/customers", key: "customers", icon: Users },
  { href: "/admin/products", key: "products", icon: Package },
  { href: "/admin/categories", key: "categories", icon: Tags },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

export function AdminNav({ newOrders }: { newOrders: number }) {
  const pathname = usePathname();
  const t = useTranslations("admin");
  return (
    <nav className="grid grid-cols-3 gap-1 sm:grid-cols-6 lg:flex lg:flex-col">
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center text-xs font-medium transition-colors lg:flex-row lg:gap-3 lg:px-3 lg:text-start lg:text-sm ${
              active ? "bg-ink text-bg" : "text-muted hover:bg-sunken hover:text-ink"
            }`}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {t(key)}
            {key === "orders" && newOrders > 0 && (
              <span className="absolute end-1.5 top-1.5 rounded-full bg-accent px-1.5 text-[11px] leading-5 font-bold text-on-accent lg:static lg:ms-auto lg:px-2 lg:text-xs">{newOrders}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
