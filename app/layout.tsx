import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { CampaignsProvider } from "@/components/campaigns/campaigns-provider";
import { DemoUserProvider } from "@/components/demo/demo-user-provider";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { ReviewProvider } from "@/components/review/review-provider";
import { SocialPostsProvider } from "@/components/social-review/social-posts-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import {
  getDemoTeamIdFromCookies,
  getDemoUserIdFromCookies,
  isDemoModeEnabled,
} from "@/lib/demo-mode";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PBUCC Team Workspace",
  description: "Internal workspace prototype for team operations",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const demoMode = isDemoModeEnabled();
  const initialDemoTeamId = demoMode ? await getDemoTeamIdFromCookies() : null;
  const initialDemoUserId = demoMode ? await getDemoUserIdFromCookies() : null;

  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <DemoUserProvider
          demoMode={demoMode}
          initialTeamId={initialDemoTeamId}
          initialUserId={initialDemoUserId}
        >
          <ThemeProvider>
            <NotificationsProvider>
              <CampaignsProvider>
                <SocialPostsProvider>
                  <ReviewProvider>{children}</ReviewProvider>
                </SocialPostsProvider>
              </CampaignsProvider>
            </NotificationsProvider>
          </ThemeProvider>
        </DemoUserProvider>
      </body>
    </html>
  );
}
