"use client";

import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
};

const COLORS = {
  info: "text-accent2",
  success: "text-accent",
  error: "text-gold",
};

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              onClick={() => dismiss(t.id)}
              className="glass pointer-events-auto flex max-w-md cursor-pointer items-center gap-2.5 rounded-xl px-4 py-2.5 shadow-panel"
            >
              <Icon size={16} className={`shrink-0 ${COLORS[t.kind]}`} />
              <span className="text-[13px] text-text">{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
