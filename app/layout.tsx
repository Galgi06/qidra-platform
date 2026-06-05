import type { Metadata } from "next";
import "@fontsource/golos-text/400.css";
import "@fontsource/golos-text/500.css";
import "@fontsource/golos-text/600.css";
import "@fontsource/golos-text/700.css";
import { AutoSignOut } from "@/components/auth/AutoSignOut";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qidra",
  description: "Qidra international halal partnership projects"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        {children}
        <AutoSignOut />
      </body>
    </html>
  );
}
