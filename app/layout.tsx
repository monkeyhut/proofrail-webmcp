import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofRail — Pre-publication claim gate for marketing & PR",
  description:
    "Preview and check claims in a project page, blog post, launch page, or report against evidence before publishing.",
  openGraph: {
    title: "ProofRail — Pre-publication claim gate for marketing & PR",
    description:
      "AI checks public claims against linked sources. A human approves. Publish stays locked until every claim clears.",
    type: "website",
    images: [
      {
        url: "/proofrail-social.png",
        width: 1200,
        height: 630,
        alt: "An ivory document approaching a coral inspection gate on a black precision rail.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofRail — Pre-publication claim gate for marketing & PR",
    description:
      "AI checks public claims against linked sources. A human approves. Publish stays locked until every claim clears.",
    images: ["/proofrail-social.png"],
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
