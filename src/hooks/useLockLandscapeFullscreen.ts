import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────
// 앱이 열리자마자 조용히 가로모드로 돌리고, 가능하면 전체화면으로 전환합니다.
// 안내 문구 없이 시도만 하고, 지원되지 않는 환경(iOS Safari 등)에서는
// 조용히 실패하고 넘어갑니다 — 에러를 던지지 않습니다.
// Capacitor 네이티브 앱에서는 AndroidManifest.xml의 screenOrientation
// 설정이 최종적으로 우선하며, 이 훅은 웹/PWA 환경을 위한 보조 수단입니다.
// ─────────────────────────────────────────────────────────────────────

export function useLockLandscapeFullscreen() {
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        const orientation = (screen as unknown as {
          orientation?: { lock?: (o: string) => Promise<void> };
        }).orientation;
        if (orientation?.lock) {
          await orientation.lock("landscape");
        }
      } catch {
        // 지원하지 않는 브라우저 — 조용히 무시
      }
    };

    const goFullscreen = async () => {
      try {
        const el = document.documentElement as HTMLElement & {
          requestFullscreen?: () => Promise<void>;
          webkitRequestFullscreen?: () => Promise<void>;
        };
        if (document.fullscreenElement) return;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      } catch {
        // 전체화면 API는 사용자 제스처가 필요한 브라우저가 많아 실패할 수 있음 — 조용히 무시
      }
    };

    lockOrientation();
    goFullscreen();

    // 첫 터치 시 다시 한 번 시도 (전체화면 API는 사용자 제스처 없이는 막히는 브라우저가 많음)
    const retryOnFirstTouch = () => {
      lockOrientation();
      goFullscreen();
      window.removeEventListener("touchstart", retryOnFirstTouch);
      window.removeEventListener("pointerdown", retryOnFirstTouch);
    };
    window.addEventListener("touchstart", retryOnFirstTouch, { once: true });
    window.addEventListener("pointerdown", retryOnFirstTouch, { once: true });

    return () => {
      window.removeEventListener("touchstart", retryOnFirstTouch);
      window.removeEventListener("pointerdown", retryOnFirstTouch);
    };
  }, []);
}
