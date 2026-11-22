import type { Metadata } from "next";
import { Oswald, Teko } from "next/font/google";
import "./globals.css";

const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["300", "400", "500"] });
const teko = Teko({ variable: "--font-teko", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "TutoresOn-Line", template: "%s · TutoresOn-Line" },
  description: "Conecta con tutores por materia, nivel y modalidad, y reserva tus tutorías.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables live on <html> so the Tailwind theme tokens declared on :root can resolve them.
    <html lang="es" className={`${oswald.variable} ${teko.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
