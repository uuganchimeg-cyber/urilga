"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import MobileOnly from "./mobile-only";
import ButterflyBorder from "./butterfly-border";
import MusicPlayer from "./music-player";
export default function SiteShell({children}:{children:ReactNode}){
  const path=usePathname();
  if(path==="/urilgadmin"||path.startsWith("/urilgadmin/"))return <>{children}</>;
  return <MobileOnly>{children}<ButterflyBorder/><MusicPlayer/></MobileOnly>;
}
