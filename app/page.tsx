"use client";
import Image from "next/image";
import { useSiteSettings } from "./settings-context";
import Countdown from "./countdown";
import BottomNav from "./bottom-nav";
import GuestWishes from "./guest-wishes";

export default function Home() {
  const settings = useSiteSettings();
  return (
    <main className="invitation-image">
      <Image
        src={settings.heroImage}
        alt="Төрсөн өдрийн урилга"
        fill
        sizes="100vw"
        preload
        unoptimized
        className="full-screen-image"
      />
      <Countdown />
      <GuestWishes />
      <BottomNav />
    </main>
  );
}



