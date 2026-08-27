import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofRail — CI for public claims",
  description:
    "Turn draft claims and source packets into reviewable evidence decisions and a verifiable proof receipt.",
  openGraph: {
    title: "ProofRail — CI for public claims",
    description:
      "The agent assembles the evidence. The human decides what may ship.",
    type: "website",
    images: [
      {
        url: "/proofrail-social.png",
        width: 1200,
        height: 630,
        alt: "An editorial evidence graph with source cards, a proof rail, and a blocked contradiction.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofRail — CI for public claims",
    description:
      "The agent assembles the evidence. The human decides what may ship.",
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
