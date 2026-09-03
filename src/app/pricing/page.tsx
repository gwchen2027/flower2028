"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useI18n, LocaleSwitcher } from "@/lib/i18n-context";

export default function PricingPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, member, loading, signOut, refreshMember } = useAuth();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(locale === "zh-CN" ? "zh-CN" : locale === "zh-TW" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US");
    } catch {
      return iso.slice(0, 10);
    }
  };

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    setMsg(null);
    try {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/member/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session": token || "" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg({ ok: true, text: t("pricing.redeem.ok") });
        setCode("");
        await refreshMember();
      } else {
        setMsg({ ok: false, text: data.message || t("pricing.redeem.bad") });
      }
    } catch {
      setMsg({ ok: false, text: t("pricing.redeem.bad") });
    } finally {
      setRedeeming(false);
    }
  };

  const handlePay = async (gateway: "alipay" | "wechat") => {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase-browser");
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/member/order", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session": token || "" },
      body: JSON.stringify({ gateway }),
    });
    const data = await res.json();
    setMsg({ ok: false, text: data.message || t("pricing.pay.tip") });
  };

  return (
    <div className="min-h-screen px-4 py-16 relative">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <LocaleSwitcher />
      </div>

      <div className="max-w-3xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="font-serif text-[var(--gold)] hover:opacity-80 transition-opacity tracking-widest text-sm">
            ← {t("app.title")}
          </Link>
          {hydrated && !loading && user && (
            <div className="flex items-center gap-3 font-sans text-xs text-[var(--text-muted)]">
              <span className="hidden sm:inline">{user.email}</span>
              <button onClick={async () => { await signOut(); router.push("/login"); }} className="hover:text-[var(--gold)] transition-colors">
                {t("nav.logout")}
              </button>
            </div>
          )}
        </div>

        <div className="text-center mb-10">
          <p className="font-serif text-[var(--gold)] text-sm tracking-[0.3em] uppercase mb-3">
            ❦ Membership
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text-cream)] mb-3 tracking-wider">
            {t("pricing.title")}
          </h1>
          <p className="font-serif text-[var(--text-muted)] text-sm">{t("pricing.subtitle")}</p>
        </div>

        {/* 未登录提示 */}
        {hydrated && !loading && !user && (
          <div className="letter-paper rounded-sm p-8 text-center mb-8">
            <p className="font-serif text-[var(--ink)] mb-4">{t("home.guest.title")}</p>
            <Link href="/login" className="gold-btn inline-block px-8 py-3 rounded-full font-sans text-sm text-[var(--night)] font-semibold">
              {t("nav.login")} / {t("nav.register")}
            </Link>
          </div>
        )}

        {/* 会员状态卡 */}
        {hydrated && user && member && (
          <div className="letter-paper rounded-sm p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-serif text-[var(--ink-soft)] text-sm mb-1">
                  {member.is_member ? (
                    <span className="text-green-800 font-semibold">● {t("member.status.active")}</span>
                  ) : (
                    <span className="text-red-800">○ {t("member.status.expired")}</span>
                  )}
                </p>
                <p className="font-sans text-xs text-[var(--ink-soft)]">
                  {t("member.expires")}：{fmtDate(member.membership_expires_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-3xl font-bold text-[var(--gold)]">{member.credits}</p>
                <p className="font-sans text-xs text-[var(--ink-soft)]">{t("member.credits")}</p>
              </div>
            </div>
            {member.is_member && (
              <Link href="/" className="gold-btn inline-block mt-5 px-8 py-2.5 rounded-full font-sans text-sm text-[var(--night)] font-semibold">
                {t("home.generate")} →
              </Link>
            )}
          </div>
        )}

        {/* 方案卡 */}
        <div className="letter-paper rounded-sm p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-baseline gap-1">
              <span className="font-serif text-5xl font-bold text-[var(--ink)]">¥{t("pricing.monthly.price")}</span>
              <span className="font-sans text-sm text-[var(--ink-soft)]">{t("pricing.monthly.unit")}</span>
            </div>
          </div>
          <ul className="space-y-3 mb-8 font-serif text-[var(--ink)]">
            {[t("pricing.monthly.f1"), t("pricing.monthly.f2"), t("pricing.monthly.f3"), t("pricing.monthly.f4")].map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-[var(--gold)] mt-0.5">✦</span>
                <span className="text-base leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>

          {/* 支付按钮 */}
          {hydrated && user && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => handlePay("alipay")} className="btn-primary py-3 rounded-full font-sans text-sm font-semibold">
                支付宝支付 ¥30
              </button>
              <button onClick={() => handlePay("wechat")} className="btn-primary py-3 rounded-full font-sans text-sm font-semibold">
                微信支付 ¥30
              </button>
            </div>
          )}
          <p className="font-sans text-xs text-[var(--ink-soft)] text-center mb-8 leading-relaxed">
            {t("pricing.pay.tip")}
          </p>

          {/* 兑换码 */}
          {hydrated && user && (
            <div className="border-t border-[var(--paper-dark)]/20 pt-6">
              <p className="font-serif text-[var(--ink)] font-semibold mb-3 text-center">{t("pricing.redeem.title")}</p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t("pricing.redeem.ph")}
                  className="flex-1 px-4 py-2.5 bg-white/60 border border-[var(--paper-dark)]/30 rounded font-sans text-[var(--ink)] text-sm outline-none focus:border-[var(--gold)] transition-colors uppercase"
                />
                <button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="gold-btn px-6 py-2.5 rounded-full font-sans text-sm text-[var(--night)] font-semibold disabled:opacity-50"
                >
                  {redeeming ? "…" : t("pricing.redeem.cta")}
                </button>
              </div>
              {msg && (
                <p className={`mt-3 text-center font-sans text-sm ${msg.ok ? "text-green-800" : "text-red-700"}`}>
                  {msg.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
