import { useEffect, useRef } from "react";

/**
 * SpotlightCursor — глобальный кастомный курсор-блик.
 *
 * - Только для устройств с тонким указателем (мышь). Touch — отключается.
 * - Реагирует на `prefers-reduced-motion`: статичная точка вместо плавного follow.
 * - Над интерактивными элементами расширяется (см. `.is-interactive`).
 * - Сам курсор НЕ скрывает родной — это блик ПОД ним. Не ломает доступность.
 */
export default function SpotlightCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dot = dotRef.current;
    const halo = haloRef.current;
    if (!dot || !halo) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let hx = mx;
    let hy = my;
    let raf: number | null = null;

    function onMove(e: MouseEvent) {
      mx = e.clientX;
      my = e.clientY;
      if (reduced) {
        hx = mx;
        hy = my;
        apply();
      } else if (raf === null) {
        raf = requestAnimationFrame(tick);
      }
    }

    function tick() {
      hx += (mx - hx) * 0.18;
      hy += (my - hy) * 0.18;
      apply();
      if (Math.abs(mx - hx) > 0.3 || Math.abs(my - hy) > 0.3) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    }

    function apply() {
      if (!dot || !halo) return;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      halo.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
    }

    function onLeave() {
      if (!dot || !halo) return;
      dot.style.opacity = "0";
      halo.style.opacity = "0";
    }
    function onEnter() {
      if (!dot || !halo) return;
      dot.style.opacity = "1";
      halo.style.opacity = "1";
    }

    function onOver(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        "a, button, [role='button'], input, textarea, select, [data-interactive]",
      );
      halo?.classList.toggle("is-interactive", Boolean(interactive));
    }

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseover", onOver, { passive: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseover", onOver);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={haloRef} className="cursor-halo" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <style>{`
        .cursor-dot, .cursor-halo {
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          will-change: transform, opacity;
          z-index: var(--z-cursor);
          opacity: 0;
          transition: opacity var(--dur-fast) var(--ease-standard);
        }
        .cursor-dot {
          width: 6px;
          height: 6px;
          margin: -3px 0 0 -3px;
          border-radius: 50%;
          background: rgba(255,255,255,0.85);
          mix-blend-mode: difference;
        }
        .cursor-halo {
          width: 36px;
          height: 36px;
          margin: -18px 0 0 -18px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.32);
          background: radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%);
          backdrop-filter: blur(2px);
          transition:
            width var(--dur-med) var(--ease-soft),
            height var(--dur-med) var(--ease-soft),
            margin var(--dur-med) var(--ease-soft),
            border-color var(--dur-fast) var(--ease-standard),
            opacity var(--dur-fast) var(--ease-standard);
        }
        .cursor-halo.is-interactive {
          width: 56px;
          height: 56px;
          margin: -28px 0 0 -28px;
          border-color: rgba(255,255,255,0.55);
          background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%);
        }
        @media (pointer: coarse) {
          .cursor-dot, .cursor-halo { display: none; }
        }
      `}</style>
    </>
  );
}
