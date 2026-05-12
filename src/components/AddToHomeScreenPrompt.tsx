'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';

const STORAGE_KEY = 'justdogs_homescreen_prompt_v1';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const narrow = window.matchMedia?.('(max-width: 768px)').matches;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (Boolean(coarse) && Boolean(narrow));
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia('(display-mode: standalone)').matches;
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mm || ios;
}

function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const noChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && noChrome;
}

export function AddToHomeScreenPrompt() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  const markDone = useCallback((reason: 'installed' | 'dismissed') => {
    try {
      localStorage.setItem(STORAGE_KEY, reason);
    } catch {
      /* private mode */
    }
    setOpen(false);
    setDeferred(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobileDevice() || isStandalone()) return;

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (stored === 'installed' || stored === 'dismissed') return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const onInstalled = () => markDone('installed');
    window.addEventListener('appinstalled', onInstalled);

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 1600);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, [markDone]);

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        markDone('installed');
      } else {
        markDone('dismissed');
      }
    } catch {
      markDone('dismissed');
    }
  };

  if (!open) return null;

  const showIOS = isIOSSafari();
  const showAndroidInstall = Boolean(deferred);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-prompt-title"
    >
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
              <Image
                src="/images/icons/logo.png"
                alt="Just Dogs"
                fill
                className="object-contain p-1"
                sizes="56px"
                priority
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <h2 id="pwa-prompt-title" className="text-lg font-semibold text-gray-900 leading-tight">
                Add to home screen
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Open Just Dogs like an app with the Jasper logo on your home screen.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => markDone('dismissed')}
            className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {showAndroidInstall && (
            <p className="text-sm text-gray-700">
              Your browser can install this app. Tap <strong>Install</strong> to add it — you won&apos;t see this again
              after it&apos;s installed.
            </p>
          )}

          {showIOS && (
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Tap the <strong>Share</strong> button in Safari (square with arrow).</li>
              <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> — the Jasper logo will appear on your home screen.</li>
            </ol>
          )}

          {!showAndroidInstall && !showIOS && (
            <p className="text-sm text-gray-700">
              Use your browser menu to <strong>Add to Home screen</strong> or <strong>Install app</strong>. This
              reminder won&apos;t show again after you close it.
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => markDone('dismissed')} className="w-full sm:w-auto">
              Not now
            </Button>
            {showAndroidInstall ? (
              <Button
                type="button"
                onClick={() => void handleInstall()}
                className="w-full sm:w-auto bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
              >
                Install
              </Button>
            ) : showIOS ? (
              <Button
                type="button"
                onClick={() => markDone('installed')}
                className="w-full sm:w-auto bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
              >
                Done — I added it
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
