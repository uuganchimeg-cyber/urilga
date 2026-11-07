"use client";

import { useEffect, useRef } from "react";

type Spark = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; radius: number };

export default function Fireworks() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, frame = 0, lastTime = 0, nextBurst = 0;
    let sparks: Spark[] = [];
    const colors = ["#ffd4ec", "#e8b3ff", "#ffcf7c", "#b9eaff", "#ff91bd"];
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = width * ratio; element.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    function burst() {
      const x = width * (.15 + Math.random() * .7);
      const y = height * (.15 + Math.random() * .5);
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        const speed = 35 + Math.random() * 115;
        const life = 1.3 + Math.random() * .8;
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, color, radius: 1 + Math.random() });
      }
      sparks = sparks.slice(-360);
    }
    function draw(time: number) {
      const dt = Math.min((time - lastTime) / 1000 || .016, .04);
      lastTime = time;
      context!.clearRect(0, 0, width, height);
      if (!document.hidden && !preference.matches) {
        if (time >= nextBurst) { burst(); nextBurst = time + 800 + Math.random() * 600; }
        sparks = sparks.filter(spark => spark.life > 0);
        for (const spark of sparks) {
          spark.life -= dt;
          const previousX = spark.x, previousY = spark.y;
          spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.vy += 40 * dt;
          spark.vx *= Math.pow(.98, dt * 60);
          context!.globalAlpha = Math.max(0, spark.life / spark.maxLife);
          context!.strokeStyle = spark.color; context!.lineWidth = spark.radius;
          context!.beginPath(); context!.moveTo(previousX, previousY); context!.lineTo(spark.x, spark.y); context!.stroke();
          context!.fillStyle = spark.color; context!.beginPath(); context!.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2); context!.fill();
        }
        context!.globalAlpha = 1;
      } else { sparks = []; }
      frame = requestAnimationFrame(draw);
    }
    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); context.clearRect(0, 0, width, height); };
  }, []);
  return <canvas ref={canvas} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100%", height: "100dvh", zIndex: 11, pointerEvents: "none" }} />;
}
