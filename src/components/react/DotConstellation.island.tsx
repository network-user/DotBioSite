import { useEffect, useRef } from "react";

/**
 * DotConstellation — лёгкая Canvas2D «созвездие» точек.
 *
 * Сцена: до 300 частиц медленно дрейфуют, между ближайшими парами рисуются
 * тонкие линии (через пространственную решётку 64×64 для O(n) поиска). При
 * наведении курсора частицы слегка отклоняются от точки, создавая ощущение
 * глубины (parallax lerp 0.08). RAF останавливается, когда контейнер вне
 * viewport — это спасает батарею и фоновые табы.
 *
 * Бюджет:
 *   - ≤300 частиц (hero) / ≤120 (case)
 *   - DPR cap 2
 *   - Spatial grid 64px клетка → ~constant edge lookups
 *   - reduced-motion = один кадр на mount и при resize, без RAF
 */

type Variant = "hero" | "case" | "halo";

interface Props {
  variant?: Variant;
  /** Override density (particles per px²). Falls back to per-variant default. */
  density?: number;
  /** Multiplier on cursor parallax displacement (0 — disabled). */
  parallax?: number;
  /** Max distance (px) at which two particles still link. */
  proximityPx?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Cached parallax offset applied to render position. */
  ox: number;
  oy: number;
}

const VARIANT_CONFIG: Record<
  Variant,
  { density: number; maxParticles: number; proximityPx: number; parallax: number; minR: number; maxR: number }
> = {
  hero: { density: 0.00018, maxParticles: 300, proximityPx: 110, parallax: 1.0, minR: 0.7, maxR: 1.6 },
  case: { density: 0.0001, maxParticles: 180, proximityPx: 95, parallax: 0.7, minR: 0.6, maxR: 1.3 },
  halo: { density: 0.00012, maxParticles: 120, proximityPx: 80, parallax: 0.5, minR: 0.6, maxR: 1.2 },
};

const GRID_CELL = 64;

export default function DotConstellation({
  variant = "hero",
  density,
  parallax,
  proximityPx,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cfg = VARIANT_CONFIG[variant];
    const effDensity = density ?? cfg.density;
    const effProximity = proximityPx ?? cfg.proximityPx;
    const effParallax = parallax ?? cfg.parallax;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;

    let pointerX = -9999;
    let pointerY = -9999;
    let pointerActive = false;

    const dotColor =
      window.getComputedStyle(document.documentElement).getPropertyValue("--dot-color").trim() ||
      "rgba(255,255,255,0.55)";
    const edgeColor =
      window.getComputedStyle(document.documentElement).getPropertyValue("--dot-edge-color").trim() ||
      "rgba(255,255,255,0.1)";

    function rebuild() {
      const rect = container!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;

      const area = width * height;
      const count = Math.min(cfg.maxParticles, Math.max(24, Math.floor(area * effDensity)));

      particles = new Array(count).fill(null).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: cfg.minR + Math.random() * (cfg.maxR - cfg.minR),
        ox: 0,
        oy: 0,
      }));
    }

    function step() {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;

        if (pointerActive && effParallax > 0) {
          const ndx = (pointerX - width / 2) / Math.max(width, 1);
          const ndy = (pointerY - height / 2) / Math.max(height, 1);
          const tx = -ndx * 24 * effParallax;
          const ty = -ndy * 24 * effParallax;
          p.ox += (tx - p.ox) * 0.08;
          p.oy += (ty - p.oy) * 0.08;
        } else {
          p.ox += (0 - p.ox) * 0.05;
          p.oy += (0 - p.oy) * 0.05;
        }
      }
    }

    function render() {
      ctx!.save();
      ctx!.scale(dpr, dpr);
      ctx!.clearRect(0, 0, width, height);

      const cols = Math.max(1, Math.ceil(width / GRID_CELL));
      const rows = Math.max(1, Math.ceil(height / GRID_CELL));
      const grid: Particle[][] = [];
      for (let i = 0; i < cols * rows; i++) grid.push([]);

      for (const p of particles) {
        const cx = Math.max(0, Math.min(cols - 1, Math.floor((p.x + p.ox) / GRID_CELL)));
        const cy = Math.max(0, Math.min(rows - 1, Math.floor((p.y + p.oy) / GRID_CELL)));
        grid[cy * cols + cx]!.push(p);
      }

      ctx!.strokeStyle = edgeColor;
      ctx!.lineWidth = 1;
      const prox2 = effProximity * effProximity;
      const neighborOffsets: ReadonlyArray<readonly [number, number]> = [
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ];

      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const bucket = grid[cy * cols + cx]!;
          for (let n = 0; n < bucket.length; n++) {
            const pi = bucket[n]!;
            const pix = pi.x + pi.ox;
            const piy = pi.y + pi.oy;
            // Same bucket: j > n avoids double-counting.
            for (let m = n + 1; m < bucket.length; m++) {
              connect(bucket[m]!, pix, piy, prox2);
            }
            for (const [dx, dy] of neighborOffsets) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
              const nb = grid[ny * cols + nx]!;
              for (let m = 0; m < nb.length; m++) {
                connect(nb[m]!, pix, piy, prox2);
              }
            }
          }
        }
      }

      ctx!.fillStyle = dotColor;
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x + p.ox, p.y + p.oy, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.restore();
    }

    function connect(b: Particle, ax: number, ay: number, prox2: number) {
      const bx = b.x + b.ox;
      const by = b.y + b.oy;
      const dx = bx - ax;
      const dy = by - ay;
      const d2 = dx * dx + dy * dy;
      if (d2 > prox2) return;
      const alpha = 1 - d2 / prox2;
      ctx!.globalAlpha = alpha * 0.6;
      ctx!.beginPath();
      ctx!.moveTo(ax, ay);
      ctx!.lineTo(bx, by);
      ctx!.stroke();
      ctx!.globalAlpha = 1;
    }

    let raf: number | null = null;
    let visible = true;
    let running = !reduced;

    function tick() {
      if (!running || !visible) {
        raf = null;
        return;
      }
      step();
      render();
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (raf !== null) return;
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    // Initial build + first frame.
    rebuild();
    render();
    if (running) start();

    let resizeRaf: number | null = null;
    const onResize = () => {
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        rebuild();
        render();
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    const onPointerMove = (e: PointerEvent) => {
      const rect = container!.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
      pointerActive = true;
    };
    const onPointerLeave = () => {
      pointerActive = false;
    };
    if (!reduced) {
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);
    }

    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                visible = entry.isIntersecting;
                if (visible && running) start();
                else stop();
              }
            },
            { rootMargin: "100px" }
          )
        : null;
    io?.observe(container);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (visible && running) start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      io?.disconnect();
    };
  }, [variant, density, parallax, proximityPx]);

  return (
    <div
      ref={containerRef}
      className={`dot-constellation${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
