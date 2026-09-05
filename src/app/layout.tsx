import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jarvis · Rust + WebAssembly Assistant",
  description: "Голосовой ассистент Джарвис: логика на Rust (WebAssembly), интерфейс на Next.js.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
