"use client";

import dynamic from "next/dynamic";
import PWAInstall from "@/components/PWAInstall";

const InstrumentPlayer = dynamic(
  () => import("@/components/InstrumentPlayer"),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <PWAInstall />
      <InstrumentPlayer />
    </main>
  );
}
