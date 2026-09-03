"use client";

import React from "react";
import { SupabaseConfigProvider } from "@/lib/supabase-config-inject";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseConfigProvider>
      <I18nProvider>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </SupabaseConfigProvider>
  );
}
