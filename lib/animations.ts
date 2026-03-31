export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

export const staggerChildren = {
  animate: { transition: { staggerChildren: 0.06 } },
};
