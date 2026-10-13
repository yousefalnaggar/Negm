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
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-ink text-bg" : "text-muted hover:bg-sunken hover:text-ink"
            }`}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {t(key)}
            {key === "orders" && newOrders > 0 && (
              <span className="ms-auto rounded-full bg-accent px-2 text-xs leading-5 font-bold text-on-accent">{newOrders}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
