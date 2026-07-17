import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function PageTransition({ children, fill }: { children: ReactNode; fill?: boolean }) {
  const reduceMotion = useReducedMotion();
  const fillClass = fill ? "h-full min-h-0 flex-1 flex flex-col" : "";
  if (reduceMotion) {
    return <div className={fillClass}>{children}</div>;
  }
  return (
    <motion.div
      className={fillClass}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
