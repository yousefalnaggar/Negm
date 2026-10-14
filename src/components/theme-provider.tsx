"use client";

import { ThemeProvider as NextThemes } from "next-themes";

// next-themes' anti-flash <script> only needs to run from the server HTML. Switching language
// remounts this provider in the browser, where React warns about creating a <script>; marking
// the client-side copy as a data block (never executed anyway) avoids that warning.
const scriptProps = typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange scriptProps={scriptProps}>
      {children}
    </NextThemes>
  );
}
