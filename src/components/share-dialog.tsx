'use client';

import { useState, useCallback, useEffect } from 'react';
import { downloadAsImage, downloadAsPDF, downloadAsWord } from '@/lib/download';

interface ShareDialogProps {
  letter: string;
  recipient: string;
  sender: string;
  letterElement: HTMLElement | null;
  onClose: () => void;
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';

export function ShareDialog({ letter, recipient, sender, letterElement, onClose }: ShareDialogProps) {
  const [downloadState, setDownloadState] = useState<Record<string, ActionState>>({});
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const filename = `情书_${recipient}_${sender}`;

  const updateState = (key: string, state: ActionState) => {
    setDownloadState(prev => ({ ...prev, [key]: state }));
    if (state === 'success' || state === 'error') {
      setTimeout(() => {
        setDownloadState(prev => ({ ...prev, [key]: 'idle' }));
      }, 2000);
    }
  };

  const handleDownloadImage = useCallback(async () => {
    if (!letterElement) return;
    updateState('image', 'loading');
    try {
      await downloadAsImage(letterElement, filename);
      updateState('image', 'success');
    } catch {
      updateState('image', 'error');
    }
  }, [letterElement, filename]);

  const handleDownloadPDF = useCallback(async () => {
    if (!letterElement) return;
    updateState('pdf', 'loading');
    try {
      await downloadAsPDF(letterElement, filename);
      updateState('pdf', 'success');
    } catch {
      updateState('pdf', 'error');
    }
  }, [letterElement, filename]);

  const handleDownloadWord = useCallback(() => {
    updateState('word', 'loading');
    try {
      downloadAsWord(letter, recipient, sender, filename);
      updateState('word', 'success');
    } catch {
      updateState('word', 'error');
    }
  }, [letter, recipient, sender, filename]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentUrl]);

  const shareText = `我写了一封情书给${recipient}，快来试试吧！`;

  const handleShareQQ = () => {
    const url = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent('情书生成器')}&desc=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleShareWeibo = () => {
    const url = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: '情书生成器',
          text: shareText,
          url: currentUrl,
        });
      } catch {
        // User cancelled or error
      }
    }
  };

  const stateIcon = (key: string) => {
    const state = downloadState[key];
    if (state === 'loading') return '...';
    if (state === 'success') return '\u2713';
    if (state === 'error') return '\u2717';
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #faf6f0 0%, #f5efe6 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ color: '#3d2b1f', background: 'rgba(61, 43, 31, 0.08)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Title */}
        <h3
          className="font-serif text-lg font-semibold mb-5 text-center"
          style={{ color: '#3d2b1f' }}
        >
          保存与分享
        </h3>

        {/* Download Section */}
        <div className="mb-5">
          <p className="font-serif text-xs mb-3" style={{ color: 'rgba(61, 43, 31, 0.5)' }}>
            下载为文件
          </p>
          <div className="grid grid-cols-3 gap-3">
            {/* Image */}
            <button
              onClick={handleDownloadImage}
              disabled={downloadState['image'] === 'loading'}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
              style={{
                background: 'rgba(201, 169, 110, 0.08)',
                color: '#3d2b1f',
              }}
            >
              <span className="text-xl">
                {stateIcon('image') || (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                )}
              </span>
              <span className="font-serif text-xs">图片</span>
            </button>

            {/* PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloadState['pdf'] === 'loading'}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
              style={{
                background: 'rgba(201, 169, 110, 0.08)',
                color: '#3d2b1f',
              }}
            >
              <span className="text-xl">
                {stateIcon('pdf') || (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                )}
              </span>
              <span className="font-serif text-xs">PDF</span>
            </button>

            {/* Word */}
            <button
              onClick={handleDownloadWord}
              disabled={downloadState['word'] === 'loading'}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
              style={{
                background: 'rgba(201, 169, 110, 0.08)',
                color: '#3d2b1f',
              }}
            >
              <span className="text-xl">
                {stateIcon('word') || (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <path d="M8 13h2v4H8zM11 13h2v3h-2zM14 13h2v5h-2z" />
                  </svg>
                )}
              </span>
              <span className="font-serif text-xs">Word</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-5" style={{ background: 'rgba(61, 43, 31, 0.1)' }} />

        {/* Share Section */}
        <div>
          <p className="font-serif text-xs mb-3" style={{ color: 'rgba(61, 43, 31, 0.5)' }}>
            分享给好友
          </p>
          <div className="grid grid-cols-4 gap-2">
            {/* WeChat - copy link */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all"
              style={{
                background: copied ? 'rgba(7, 193, 96, 0.1)' : 'rgba(201, 169, 110, 0.08)',
                color: '#3d2b1f',
              }}
            >
              <span className="text-xl">
                {copied ? (
                  <span style={{ color: '#07c14a' }}>{'\u2713'}</span>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M8.5 10a.5.5 0 110-1 .5.5 0 010 1zM5 10a.5.5 0 110-1 .5.5 0 010 1z" fill="#07c14a" />
                    <path d="M9 3C4.58 3 1 5.91 1 9.5c0 1.93 1.06 3.66 2.73 4.87L3 17l2.8-1.45c.7.2 1.44.32 2.2.35" stroke="#07c14a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 8.5c-3.04 0-5.5 2.12-5.5 4.75s2.46 4.75 5.5 4.75c.63 0 1.24-.09 1.8-.25L19 19l-.55-2.18c1.15-.97 1.85-2.3 1.85-3.57 0-2.63-2.46-4.75-5.5-4.75z" stroke="#07c14a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.5 13a.5.5 0 110-1 .5.5 0 010 1zM16.5 13a.5.5 0 110-1 .5.5 0 010 1z" fill="#07c14a" />
                  </svg>
                )}
              </span>
              <span className="font-serif text-[10px]">{copied ? '已复制' : '微信'}</span>
            </button>

            {/* QQ */}
            <button
              onClick={handleShareQQ}
              className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all"
              style={{
                background: 'rgba(201, 169, 110, 0.08)',
                color: '#3d2b1f',
              }}
            >
              <span className="text-xl">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9v2.5c-.87.67-1.5 1.5-1.5 2.5 0 .83.5 1.58 1.28 2.13C5.5 18.5 8.5 22 12 22s6.5-3.5 7.22-5.87c.78-.55 1.28-1.3 1.28-2.13 0-1-.63-1.83-1.5-2.5V9c0-3.87-3.13-7-7-7z" stroke="#12b7f5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="9" r="1" fill="#12b7f5" />
                  <circle cx="15" cy="9" r="1" fill="#12b7f5" />
                </svg>
              </span>
              <span className="font-serif text-[10px]">QQ</span>
            </button>

            {/* Weibo */}
            <button
              onClick={handleShareWeibo}
              className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all"
              style={{
                background: 'rgba(201, 169, 110, 0.08)',
                color: '#3d2b1f',
              }}
            >
              <span className="text-xl">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M10.1 18.3c-3.4.4-6.3-1.2-6.5-3.5-.2-2.3 2.4-4.5 5.8-4.9 3.4-.4 6.3 1.2 6.5 3.5.2 2.3-2.4 4.5-5.8 4.9z" stroke="#e6162d" strokeWidth="1.3" />
                  <path d="M17 8.5c.8-.3 1.3-1 1.2-1.8-.1-.8-.8-1.4-1.6-1.4" stroke="#e6162d" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M19.5 6c1.5-.5 2.4-1.8 2.2-3.2-.2-1.4-1.4-2.5-2.9-2.6" stroke="#e6162d" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <span className="font-serif text-[10px]">微博</span>
            </button>

            {/* Native Share / Copy Link */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all"
                style={{
                  background: 'rgba(201, 169, 110, 0.08)',
                  color: '#3d2b1f',
                }}
              >
                <span className="text-xl">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </span>
                <span className="font-serif text-[10px]">更多</span>
              </button>
            ) : (
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all"
                style={{
                  background: copied ? 'rgba(201, 169, 110, 0.2)' : 'rgba(201, 169, 110, 0.08)',
                  color: '#3d2b1f',
                }}
              >
                <span className="text-xl">
                  {copied ? (
                    <span style={{ color: '#c9a96e' }}>{'\u2713'}</span>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </span>
                <span className="font-serif text-[10px]">{copied ? '已复制' : '复制链接'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
