import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digital Survey System",
  description: "Site survey capture for insulation/manufacturing workflows",
};

import { headers } from 'next/headers';
import { UserRole } from "@/lib/supabase/types";
import { WatermarkProvider } from "@/components/security/WatermarkProvider";
import SecurityGuard from "@/components/security/SecurityGuard";
import LogoutButton from '@/components/auth/LogoutButton';

// ... existing imports

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const authedUserId = headersList.get('x-user-id');
  const userId = authedUserId || 'preview-user';
  const role = (headersList.get('x-user-role') as UserRole) || 'client';
  const company = headersList.get('x-user-company') || 'TES Preview';

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <WatermarkProvider userId={userId} userRole={role} companyName={company} >
          <SecurityGuard />
          <div className="min-h-dvh">
            <header className="border-b border-slate-200 bg-white">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-slate-900" />
                  <div>
                    <div className="text-sm font-semibold tracking-tight">Digital Survey System</div>
                    <div className="text-xs text-slate-500">{company} • {role.toUpperCase()}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">Surveys</div>
                {authedUserId ? <LogoutButton /> : null}
              </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
          </div>
        </WatermarkProvider>
      </body>
    </html>
  );
}
