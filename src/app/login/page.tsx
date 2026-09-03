"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseConfig } from "@/lib/supabase-config-inject";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useI18n, LocaleSwitcher } from "@/lib/i18n-context";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isLoading: configLoading } = useSupabaseConfig();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configLoading) return;
    setBusy(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        // 自动确认开启，直接登录
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
        if (loginErr) throw loginErr;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/pricing");
    } catch {
      setError(t("auth.fail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative">
      <div className="absolute top-4 right-4 z-20">
        <LocaleSwitcher />
      </div>

      <div className="w-full max-w-md letter-paper relative rounded-sm p-8 sm:p-10" style={{ animation: "letterIn 0.8s cubic-bezier(0.22,1,0.36,1)" }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-dashed border-[var(--gold)]/50 text-[var(--gold)] text-2xl font-serif mb-3">
            ❦
          </div>
          <h1 className="font-serif text-2xl font-bold text-[var(--ink)] tracking-widest">
            {mode === "login" ? t("auth.login.title") : t("auth.register.title")}
          </h1>
          <p className="font-serif text-sm text-[var(--ink-soft)] mt-2">{t("app.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block font-sans text-xs text-[var(--ink-soft)] mb-1.5 tracking-wide">
                {t("auth.name")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/60 border border-[var(--paper-dark)]/30 rounded font-sans text-[var(--ink)] outline-none focus:border-[var(--gold)] transition-colors"
              />
            </div>
          )}
          <div>
            <label className="block font-sans text-xs text-[var(--ink-soft)] mb-1.5 tracking-wide">
              {t("auth.email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.email.ph")}
              className="w-full px-4 py-2.5 bg-white/60 border border-[var(--paper-dark)]/30 rounded font-sans text-[var(--ink)] outline-none focus:border-[var(--gold)] transition-colors"
            />
          </div>
          <div>
            <label className="block font-sans text-xs text-[var(--ink-soft)] mb-1.5 tracking-wide">
              {t("auth.password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.password.ph")}
              className="w-full px-4 py-2.5 bg-white/60 border border-[var(--paper-dark)]/30 rounded font-sans text-[var(--ink)] outline-none focus:border-[var(--gold)] transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-700 font-sans text-center">{error}</p>}

          <button
            type="submit"
            disabled={busy || configLoading}
            className="gold-btn w-full py-3 rounded-full font-sans text-sm tracking-widest text-[var(--night)] font-semibold disabled:opacity-50"
          >
            {busy ? t("home.generating") : mode === "login" ? t("auth.login.cta") : t("auth.register.cta")}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="w-full text-center mt-6 font-sans text-sm text-[var(--ink-soft)] hover:text-[var(--gold)] transition-colors"
        >
          {mode === "login" ? t("auth.to_register") : t("auth.to_login")}
        </button>
      </div>
    </div>
  );
}
