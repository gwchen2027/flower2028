'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShareDialog } from '@/components/share-dialog';
import { useAuth } from '@/lib/auth-context';
import { useI18n, LocaleSwitcher } from '@/lib/i18n-context';

/* ------------------------------------------------------------------ */
/*  Deterministic pseudo-random based on seed                           */
/* ------------------------------------------------------------------ */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/* ------------------------------------------------------------------ */
/*  Petal Component - 仅在客户端渲染以避免 hydration 错误               */
/* ------------------------------------------------------------------ */
function Petal({ index }: { index: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const style = useMemo<React.CSSProperties>(() => {
    const r = (offset: number) => seededRandom(index * 100 + offset);
    // 限制精度以避免 hydration 不匹配
    const round = (n: number, decimals: number) => Number(n.toFixed(decimals));
    return {
      left: `${round(r(1) * 100, 2)}%`,
      ['--drift' as string]: `${round((r(2) - 0.5) * 160, 2)}px`,
      ['--spin' as string]: `${round(r(3) * 720 - 360, 2)}deg`,
      ['--duration' as string]: `${round(10 + r(4) * 10, 2)}s`,
      ['--delay' as string]: `${round(r(5) * 12, 2)}s`,
      fontSize: `${round(12 + r(6) * 10, 2)}px`,
      opacity: round(0.4 + r(7) * 0.4, 3),
    };
  }, [index]);

  const petals = ['🌸', '🌸', '🌺', '🌸', '🌷'];
  const petal = petals[index % petals.length];

  // 服务端渲染时返回空占位，客户端挂载后再显示
  if (!mounted) {
    return <span className="petal" style={{ visibility: 'hidden' }}>{petal}</span>;
  }

  return (
    <span className="petal" style={style}>
      {petal}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Wax Seal Component                                                  */
/* ------------------------------------------------------------------ */
function WaxSeal() {
  return (
    <div className="wax-seal mx-auto mt-6">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="rgba(255,255,255,0.25)"
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, member, loading: authLoading, supabase, signOut } = useAuth();

  const [recipient, setRecipient] = useState('');
  const [sender, setSender] = useState('');
  const [letter, setLetter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const letterRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setHydrated(true), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const canWrite = hydrated && !authLoading && user && member?.is_member && member.credits > 0;

  const generateLetter = useCallback(async () => {
    if (!user || !supabase) {
      router.push('/login');
      return;
    }
    if (!recipient.trim() || !sender.trim()) {
      setError(t('error.gen_failed'));
      return;
    }

    setError('');
    setLetter('');
    setShowLetter(true);
    setIsGenerating(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': token || '' },
        body: JSON.stringify({
          recipient: recipient.trim(),
          sender: sender.trim(),
        }),
        signal: abortRef.current.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error(t('error.gen_failed'));

      const decoder = new TextDecoder();
      let fullText = '';
      let streamError = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullText += parsed.content;
                setLetter(fullText);
              } else if (parsed.error) {
                streamError = parsed.message || parsed.error;
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }

      if (streamError) {
        setError(streamError);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : t('error.gen_failed'));
    } finally {
      setIsGenerating(false);
    }
  }, [recipient, sender, user, supabase, router, t]);

  const handleReset = () => {
    setLetter('');
    setShowLetter(false);
    setError('');
  };

  const handleRetry = () => {
    setLetter('');
    setError('');
    generateLetter();
  };

  return (
    <div className="love-letter-bg min-h-screen relative overflow-hidden">
      {/* Petals */}
      {Array.from({ length: 15 }).map((_, i) => (
        <Petal key={i} index={i} />
      ))}

      {/* Top nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-8 py-4">
        <Link href="/pricing" className="font-sans text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors tracking-wider">
          {t('nav.pricing')}
        </Link>
        <div className="flex items-center gap-3">
          {hydrated && member && (
            <span className="hidden sm:inline font-sans text-xs text-[var(--gold)]/80">
              {member.is_member ? `✦ ${member.credits} ${t('member.credits.unit')}` : ''}
            </span>
          )}
          {hydrated && !authLoading && user ? (
            <>
              <Link href="/pricing" className="font-sans text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                {t('nav.account')}
              </Link>
              <button onClick={async () => { await signOut(); }} className="font-sans text-xs text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <Link href="/login" className="font-sans text-xs text-[var(--gold)] hover:opacity-80 transition-opacity">
              {t('nav.login')} / {t('nav.register')}
            </Link>
          )}
          <LocaleSwitcher />
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-4 py-12 sm:py-16">
        {/* Header */}
        <header className="text-center mb-10 sm:mb-14">
          <h1
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider mb-3"
            style={{ color: '#faf6f0' }}
          >
            {t('app.title')}
          </h1>
          <p
            className="font-serif text-sm sm:text-base tracking-wide"
            style={{ color: 'rgba(201, 169, 110, 0.7)' }}
          >
            {t('app.subtitle')}
          </p>
        </header>

        {/* Guest gate */}
        {hydrated && !authLoading && !user && (
          <div className="w-full max-w-md letter-paper rounded-lg px-8 py-10 text-center">
            <p className="font-serif text-xl text-[var(--ink)] mb-3">❦</p>
            <p className="font-serif text-lg text-[var(--ink)] mb-2">{t('home.guest.title')}</p>
            <p className="font-serif text-sm text-[var(--ink-soft)] mb-6">{t('home.guest.desc')}</p>
            <Link href="/login" className="gold-btn inline-block px-10 py-3 rounded-lg font-serif text-base font-semibold tracking-wider">
              {t('nav.login')} / {t('nav.register')}
            </Link>
          </div>
        )}

        {/* Paywall gate */}
        {hydrated && !authLoading && user && !canWrite && !showLetter && (
          <div className="w-full max-w-md letter-paper rounded-lg px-8 py-10 text-center">
            <p className="font-serif text-xl text-[var(--gold)] mb-3">✦</p>
            <p className="font-serif text-lg text-[var(--ink)] mb-2">{t('home.paywall.title')}</p>
            <p className="font-serif text-sm text-[var(--ink-soft)] mb-6 leading-relaxed">{t('home.paywall.desc')}</p>
            <Link href="/pricing" className="gold-btn inline-block px-10 py-3 rounded-lg font-serif text-base font-semibold tracking-wider">
              {t('home.paywall.cta')}
            </Link>
          </div>
        )}

        {/* Input Section */}
        {!showLetter && (!user || canWrite) && (
          <div className="w-full max-w-md space-y-6 mb-10">
            {user && member?.is_member && (
              <p className="text-center font-sans text-xs" style={{ color: 'rgba(201,169,110,0.75)' }}>
                {t('member.credits')}：{member.credits} {t('member.credits.unit')}
              </p>
            )}
            <div className="space-y-2">
              <label
                className="font-serif text-sm tracking-wider block"
                style={{ color: 'rgba(250, 246, 240, 0.6)' }}
              >
                {t('home.recipient')}
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
                placeholder={t('home.recipient.ph')}
                className="input-dark w-full px-4 py-3 rounded-lg font-serif text-base"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <label
                className="font-serif text-sm tracking-wider block"
                style={{ color: 'rgba(250, 246, 240, 0.6)' }}
              >
                {t('home.sender')}
              </label>
              <input
                type="text"
                value={sender}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSender(e.target.value)}
                placeholder={t('home.sender.ph')}
                className="input-dark w-full px-4 py-3 rounded-lg font-serif text-base"
                maxLength={20}
              />
            </div>

            {error && (
              <p className="text-center text-sm" style={{ color: '#d4574a' }}>
                {error}
              </p>
            )}

            <button
              onClick={generateLetter}
              disabled={isGenerating}
              className="gold-btn w-full py-3.5 rounded-lg font-serif text-base font-semibold tracking-wider"
            >
              {isGenerating ? t('home.generating') : t('home.generate')}
            </button>
          </div>
        )}

        {/* Letter Display */}
        {showLetter && (
          <div className="w-full max-w-2xl">
            <div
              ref={letterRef}
              className="letter-paper letter-animate relative rounded-lg px-8 sm:px-12 md:px-16 py-10 sm:py-14"
            >
              {/* Letter content */}
              <div className="letter-scroll max-h-[65vh] overflow-y-auto pr-2">
                {letter ? (
                  <div
                    className={`letter-text whitespace-pre-wrap text-base sm:text-lg ${
                      isGenerating ? 'typing-cursor' : ''
                    }`}
                  >
                    {letter}
                  </div>
                ) : isGenerating ? (
                  <div className="letter-text text-center py-8">
                    <p className="typing-cursor" style={{ color: '#3d2b1f' }}>
                      正在落笔
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Wax seal at the bottom */}
              {!isGenerating && letter && <WaxSeal />}
            </div>

            {/* Action buttons */}
            {!isGenerating && letter && (
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="gold-btn px-6 py-2.5 rounded-lg font-serif text-sm tracking-wider"
                >
                  {t('letter.share')}
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-lg font-serif text-sm tracking-wider border"
                  style={{ borderColor: 'rgba(201, 169, 110, 0.3)', color: 'rgba(250, 246, 240, 0.7)' }}
                >
                  {t('letter.again')}
                </button>
              </div>
            )}

            {/* Error with retry */}
            {!isGenerating && error && !letter && (
              <div className="text-center mt-6 space-y-3">
                <p className="text-sm" style={{ color: '#d4574a' }}>
                  {error}
                </p>
                {(error.includes(t('error.member_required')) || error.includes('NO_CREDITS') || error.includes(t('error.no_credits'))) ? (
                  <Link href="/pricing" className="gold-btn inline-block px-6 py-2.5 rounded-lg font-serif text-sm tracking-wider">
                    {t('home.paywall.cta')}
                  </Link>
                ) : null}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleRetry}
                    className="gold-btn px-6 py-2.5 rounded-lg font-serif text-sm tracking-wider"
                  >
                    {t('letter.retry')}
                  </button>
                  <button
                    onClick={() => { setShowLetter(false); setError(''); }}
                    className="px-6 py-2.5 rounded-lg font-serif text-sm tracking-wider border"
                    style={{ borderColor: 'rgba(201, 169, 110, 0.3)', color: 'rgba(250, 246, 240, 0.6)' }}
                  >
                    {t('letter.back')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer
          className="mt-auto pt-12 text-center font-serif text-xs tracking-wider"
          style={{ color: 'rgba(250, 246, 240, 0.2)' }}
        >
          以文字之名，诉心中深情
        </footer>
      </div>

      {/* Share Dialog */}
      {showShareDialog && letter && letterRef.current && (
        <ShareDialog
          letter={letter}
          recipient={recipient}
          sender={sender}
          letterElement={letterRef.current}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </div>
  );
}
