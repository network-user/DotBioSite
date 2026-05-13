import { useEffect, useRef } from "react";

/**
 * NoiseBackground — лёгкая текстура зерна на фоне через <canvas>.
 *
 * Реализация:
 *   - Один раз генерируем 128×128 noise-тайл (Uint8 → ImageData).
 *   - Растягиваем его на весь viewport через CSS-режим повтора фоном.
 *   - При resize — перерисовываем (мало стоит, тайл уже сгенерирован).
 *
 * Уважает prefers-reduced-motion: рисуется ОДИН раз без анимации.
 * Можно полностью отключить установкой data-no-noise на body.
 */
export default function NoiseBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (document.body.dataset.noNoise === "1") return;

    const TILE = 128;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = TILE;
    tileCanvas.height = TILE;
    const tctx = tileCanvas.getContext("2d");
    if (!tctx) return;

    const imageData = tctx.createImageData(TILE, TILE);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.floor(Math.random() * 36);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 22;
    }
    tctx.putImageData(imageData, 0, 0);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function draw() {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      const pattern = ctx.createPattern(tileCanvas, "repeat");
      if (!pattern) return;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
    }

    draw();

    let raf: number | null = null;
    function onResize() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    }
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="noise-bg"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        mixBlendMode: "screen",
        opacity: 0.5,
      }}
    />
  );
}
