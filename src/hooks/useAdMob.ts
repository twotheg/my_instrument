import { useCallback, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────
// Capacitor로 앱을 네이티브 셸(Android)로 감쌌을 때만 실제로 동작합니다.
// 웹 브라우저(Vercel 미리보기 등)에서는 Capacitor가 없으므로 아무 것도
// 하지 않고 조용히 넘어갑니다 — 개발 중에도 에러 없이 그대로 테스트 가능.
//
// 실제 배포 전에 아래 두 개의 광고 단위 ID를 AdMob 콘솔에서 발급받은
// 값으로 바꿔주세요. (테스트 중에는 구글 공식 테스트 ID를 그대로 써도 됩니다)
// ─────────────────────────────────────────────────────────────────────

const BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"; // TODO: 실제 배너 광고 단위 ID로 교체
const INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"; // TODO: 실제 전면 광고 단위 ID로 교체

// 악기를 몇 번 바꿀 때마다 전면 광고를 띄울지
const INTERSTITIAL_EVERY_N_SWITCHES = 4;

// 문자열 변수로 둬서 웹 빌드(Vercel) 시 번들러가 이 패키지를 미리 찾지 않도록 함.
// Capacitor 네이티브 프로젝트에 `npm i @capacitor-community/admob`로 설치한 뒤에만 실제로 로드됩니다.
const ADMOB_PACKAGE = "@capacitor-community/admob";

function isNativeApp(): boolean {
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();
}

export function useAdMob() {
  const initializedRef = useRef(false);
  const switchCountRef = useRef(0);

  // 앱 시작 시 배너 광고 준비 + 하단에 표시
  useEffect(() => {
    if (!isNativeApp() || initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      try {
        const mod = await import(/* @vite-ignore */ ADMOB_PACKAGE);
        const { AdMob, BannerAdPosition, BannerAdSize } = mod;
        await AdMob.initialize({ initializeForTesting: false });
        await AdMob.showBanner({
          adId: BANNER_AD_UNIT_ID,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
        });
      } catch (err) {
        console.warn("[AdMob] 배너 광고 초기화 실패:", err);
      }
    })();
  }, []);

  // 악기를 바꿀 때마다 호출 — N번째마다 전면 광고 표시
  const notifyInstrumentChange = useCallback(() => {
    switchCountRef.current += 1;
    if (switchCountRef.current % INTERSTITIAL_EVERY_N_SWITCHES !== 0) return;
    if (!isNativeApp()) return;

    (async () => {
      try {
        const mod = await import(/* @vite-ignore */ ADMOB_PACKAGE);
        const { AdMob } = mod;
        await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID });
        await AdMob.showInterstitial();
      } catch (err) {
        console.warn("[AdMob] 전면 광고 표시 실패:", err);
      }
    })();
  }, []);

  return { isNativeApp: isNativeApp(), notifyInstrumentChange };
}
