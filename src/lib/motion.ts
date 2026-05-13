/**
 * motion.ts — общие variants и easing для framer-motion.
 *
 * Длительности и easing согласованы с CSS-токенами (--dur-*, --ease-*).
 * Reduced-motion обрабатывается framer-motion автоматически через
 * MotionConfig + reducedMotion="user", но здесь мы дополнительно держим
 * helpers для ручной проверки.
 */

import type { Variants, Transition } from "framer-motion";

export const EASE = {
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  soft: [0.16, 1, 0.3, 1] as [number, number, number, number],
  snappy: [0.2, 0, 0, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
};

export const DUR = {
  fast: 0.16,
  med: 0.24,
  slow: 0.36,
  slower: 0.56,
  glacial: 0.84,
};

/** Стандартный fade-in от низа вверх. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE.soft },
  },
};

/** Чуть медленнее, с лёгкой задержкой — для заголовков секций. */
export const fadeUpDelayed = (delay = 0): Variants => ({
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slower, ease: EASE.soft, delay },
  },
});

/** Staggered children — для grid/list контейнеров. */
export const staggerContainer = (stagger = 0.08, delay = 0): Variants => ({
  hidden: {},
  visible: {
    transition: {
      delayChildren: delay,
      staggerChildren: stagger,
    },
  },
});

/** Clip-path reveal — Apple-style. */
export const clipReveal: Variants = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)" },
  visible: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: DUR.glacial, ease: EASE.soft },
  },
};

/** Magnetic-hover transition (используется на CTA). */
export const magneticTransition: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 22,
  mass: 0.6,
};
