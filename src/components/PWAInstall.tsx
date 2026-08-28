"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 이미 설치됐는지 확인
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // SW 등록
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-3 bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎵</span>
        <div className="flex-1">
          <p className="text-white text-sm font-bold">나의악기 설치하기</p>
          <p className="text-white/70 text-xs">홈 화면에 추가하면 앱처럼 사용!</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-white text-purple-600 text-xs font-bold rounded-lg"
        >
          설치
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="text-white/60 hover:text-white p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
