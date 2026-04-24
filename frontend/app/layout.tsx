import "./globals.css";
import SiteHeader from "@/components/site-header";
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
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
