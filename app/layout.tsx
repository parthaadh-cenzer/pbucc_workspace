import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { CampaignsProvider } from "@/components/campaigns/campaigns-provider";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { ReviewProvider } from "@/components/review/review-provider";
import { SocialPostsProvider } from "@/components/social-review/social-posts-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PBUCC Team Workspace",
  description: "Internal workspace prototype for team operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <NotificationsProvider>
            <CampaignsProvider>
              <SocialPostsProvider>
                <ReviewProvider>{children}</ReviewProvider>
              </SocialPostsProvider>
            </CampaignsProvider>
          </NotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
