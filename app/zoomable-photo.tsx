"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";

const initialView = { scale: 1, x: 0, y: 0 };

function measure(touches: TouchEvent<HTMLDivElement>["touches"]) {
  const first = touches[0];
  const second = touches[1];
  if (!second) return { x: first.clientX, y: first.clientY, distance: 0 };
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
    distance: Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY),
  };
}

export default function ZoomablePhoto({ children, onSwipe }: {
  children: ReactNode;
  onSwipe?: (direction: -1 | 1) => void;
}) {
  const [view, setView] = useState(initialView);
  const current = useRef(initialView);
  const gesture = useRef<{ start: ReturnType<typeof measure>; view: typeof initialView } | null>(null);
  const swiping = useRef(false);

  function start(event: TouchEvent<HTMLDivElement>) {
    const point = measure(event.touches);
    gesture.current = { start: point, view: current.current };
    swiping.current = event.touches.length === 1 && current.current.scale === 1;
  }

  function move(event: TouchEvent<HTMLDivElement>) {
    if (!gesture.current || swiping.current) return;
    const { start, view } = gesture.current;
    const point = measure(event.touches);
    const scale = start.distance
      ? Math.min(4, Math.max(1, view.scale * point.distance / start.distance))
      : view.scale;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = scale / view.scale;
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const limitX = bounds.width * (scale - 1) / 2;
    const limitY = bounds.height * (scale - 1) / 2;
    const x = point.x - centerX - (start.x - centerX - view.x) * ratio;
    const y = point.y - centerY - (start.y - centerY - view.y) * ratio;
    const next = {
      scale,
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y)),
    };
    current.current = next;
    setView(next);
  }

  function end(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length) {
      start(event);
      swiping.current = false;
      return;
    }
    const origin = gesture.current?.start;
    gesture.current = null;
    if (!origin || !swiping.current) return;
    const dx = event.changedTouches[0].clientX - origin.x;
    const dy = event.changedTouches[0].clientY - origin.y;
    if (Math.abs(dx) > Math.max(45, Math.abs(dy))) onSwipe?.(dx > 0 ? -1 : 1);
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "none" }}
      onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      onTouchCancel={() => { gesture.current = null; swiping.current = false; }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        {children}
      </div>
    </div>
  );
}
