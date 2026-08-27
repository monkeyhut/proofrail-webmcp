import type { Metadata } from "next";
import "./globals.css";
import "./premium.css";

export const metadata: Metadata = {
  title: "ProofRail — Pre-publication claim gate for marketing & PR",
  description:
    "Preview and check claims in a launch page, project page, blog post, or report against evidence before publishing.",
  openGraph: {
    title: "ProofRail — Pre-publication claim gate for marketing & PR",
    description:
      "AI checks public claims against linked sources. A human approves. Publish stays locked until every claim clears.",
    type: "website",
    images: [
      {
        url: "/proofrail-social-v3.png",
        width: 1200,
        height: 630,
        alt: "ProofRail beside a clean launch-page preview with a visible human publication gate.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofRail — Pre-publication claim gate for marketing & PR",
    description:
      "AI checks public claims against linked sources. A human approves. Publish stays locked until every claim clears.",
    images: ["/proofrail-social-v3.png"],
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
