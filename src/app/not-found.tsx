import Link from "next/link";

// Requests outside a locale (rare; the proxy adds one) land here.
export default function NotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <Link href="/">404 · الصفحة غير موجودة · Page not found</Link>
      </body>
    </html>
  );
}
