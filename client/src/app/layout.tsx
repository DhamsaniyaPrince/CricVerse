import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CricVerse | Live Cricket Scoring & Real-time Analytics",
  description: "Experience cricket like never before. Live scores, ball-by-ball updates, commentary, player career charts, and real-time wagon wheel coordinates.",
  keywords: ["cricket", "live scores", "cricverse", "crickheroes", "cricbuzz", "sports analytics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} dark h-full antialiased`}
    >
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        <script
          id="theme-loader"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'light') {
                  document.documentElement.classList.add('light-mode');
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light-mode');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-[#0b0c10] text-gray-100 flex flex-col font-sans selection:bg-[#66fcf1] selection:text-[#0b0c10]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

