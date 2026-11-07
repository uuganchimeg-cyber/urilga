"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { defaultSettings, type SettingsDocument } from "./lib/site-settings";
const SettingsContext = createContext(defaultSettings);
export function SettingsProvider({children}:{children:ReactNode}){
  const [settings,setSettings]=useState(defaultSettings);
  const revision=useRef(-1);
  useEffect(()=>{
    const controller=new AbortController();
    const load=async()=>{try{const response=await fetch("/api/settings",{cache:"no-store",signal:controller.signal});if(!response.ok)return;const doc:SettingsDocument=await response.json();if(doc.revision!==revision.current){revision.current=doc.revision;setSettings(doc.settings);}}catch{}};
    void load();const timer=setInterval(()=>{if(!document.hidden)void load();},15000);
    window.addEventListener("focus",load);window.addEventListener("site-settings-changed",load);
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener("focus",load);window.removeEventListener("site-settings-changed",load);};
  },[]);
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}
export const useSiteSettings=()=>useContext(SettingsContext);
