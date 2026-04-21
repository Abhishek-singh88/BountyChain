import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "BountyChain",
  description: "Decentralized bounties on Stellar Soroban",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
