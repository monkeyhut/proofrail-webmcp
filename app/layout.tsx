import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://proofrail-webmcp.kingacht.chatgpt.site"),
  title: "ProofRail — See the page. Prove every claim.",
  description:
    "The pre-publication review room for marketing and PR: preview the real page, connect factual claims to evidence, and keep release locked until a human approves.",
  openGraph: {
    title: "ProofRail — See the page. Prove every claim.",
    description:
      "Preview the real publication, prove every factual claim, and keep release locked until a human approves the exact wording.",
    type: "website",
    images: [
      {
        url: "/og-proofrail-v4.png",
        width: 1200,
        height: 630,
        alt: "ProofRail publication canvas with an evidence rail stopping at a human-operated release gate.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofRail — See the page. Prove every claim.",
    description:
      "Preview the real publication, prove every factual claim, and keep release locked until a human approves the exact wording.",
    images: ["/og-proofrail-v4.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
