'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ShareDialog } from '@/components/share-dialog';

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
  const [recipient, setRecipient] = useState('');
  const [sender, setSender] = useState('');
  const [letter, setLetter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [error, setError] = useState('');
  const letterRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const generateLetter = useCallback(async () => {
    if (!recipient.trim() || !sender.trim()) {
      setError('请填写收信人和写信人的名字');
      return;
    }

    setError('');
    setLetter('');
    setShowLetter(true);
    setIsGenerating(true);

    // Abort previous request if any
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipient.trim(),
          sender: sender.trim(),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('生成失败，请重试');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let fullText = '';

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
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [recipient, sender]);

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

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-4 py-12 sm:py-16">
        {/* Header */}
        <header className="text-center mb-10 sm:mb-14">
          <h1
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider mb-3"
            style={{ color: '#faf6f0' }}
          >
            情书生成器
          </h1>
          <p
            className="font-serif text-sm sm:text-base tracking-wide"
            style={{ color: 'rgba(201, 169, 110, 0.7)' }}
          >
            让 AI 为你写下最真挚的情话
          </p>
        </header>

        {/* Input Section */}
        {!showLetter && (
          <div className="w-full max-w-md space-y-6 mb-10">
            <div className="space-y-2">
              <label
                className="font-serif text-sm tracking-wider block"
                style={{ color: 'rgba(250, 246, 240, 0.6)' }}
              >
                收信人
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
                placeholder="请输入 TA 的名字"
                className="input-dark w-full px-4 py-3 rounded-lg font-serif text-base"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <label
                className="font-serif text-sm tracking-wider block"
                style={{ color: 'rgba(250, 246, 240, 0.6)' }}
              >
                写信人
              </label>
              <input
                type="text"
                value={sender}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSender(e.target.value)}
                placeholder="请输入你的名字"
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
              {isGenerating ? '正在书写...' : '生成情书'}
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
                  保存与分享
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-lg font-serif text-sm tracking-wider border"
                  style={{ borderColor: 'rgba(201, 169, 110, 0.3)', color: 'rgba(250, 246, 240, 0.7)' }}
                >
                  再写一封
                </button>
              </div>
            )}

            {/* Error with retry */}
            {!isGenerating && error && !letter && (
              <div className="text-center mt-6 space-y-3">
                <p className="text-sm" style={{ color: '#d4574a' }}>
                  {error}
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleRetry}
                    className="gold-btn px-6 py-2.5 rounded-lg font-serif text-sm tracking-wider"
                  >
                    重试
                  </button>
                  <button
                    onClick={() => { setShowLetter(false); setError(''); }}
                    className="px-6 py-2.5 rounded-lg font-serif text-sm tracking-wider border"
                    style={{ borderColor: 'rgba(201, 169, 110, 0.3)', color: 'rgba(250, 246, 240, 0.6)' }}
                  >
                    返回
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
