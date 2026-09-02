"use client";

import { useStore } from "@/lib/store";
import { motion } from "framer-motion";
import { ArrowRight, Shuffle } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";

const EXAMPLES = [
  "Black holes",
  "The Roman Empire",
  "Neural networks",
  "Fermentation",
  "Jazz harmony",
  "Ocean currents",
  "Cryptography",
  "Bioluminescence",
];

export function Composer() {
  const startMap = useStore((s) => s.startMap);
  const loadingMap = useStore((s) => s.loadingMap);
  const [value, setValue] = useState("");

  const submit = (v?: string) => {
    const concept = (v ?? value).trim();
    if (!concept || loadingMap) return;
    void startMap(concept);
  };

  const surprise = () => submit(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.3, 1] }}
        className="pointer-events-auto w-full max-w-xl text-center"
      >
        <motion.div
          className="mb-5 inline-flex text-accent"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Logo size={52} />
        </motion.div>

        <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">Mycelium</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-dim">
          Grow a map of any idea. Type a topic and watch it bloom into a living network of
          connected concepts — then explore forever.
        </p>

        <div className="mt-8">
          <div className="group relative flex items-center gap-2 rounded-2xl border border-border bg-panel/70 p-1.5 pl-4 shadow-panel backdrop-blur transition-colors focus-within:border-accent/60">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Explore anything…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-text placeholder:text-faint focus:outline-none"
            />
            <button
              onClick={() => surprise()}
              title="Surprise me"
              className="rounded-xl p-2.5 text-dim transition-colors hover:bg-surface hover:text-text"
            >
              <Shuffle size={17} />
            </button>
            <button
              onClick={() => submit()}
              disabled={!value.trim() || loadingMap}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[14px] font-semibold text-bg shadow-glow transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              Grow
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {EXAMPLES.slice(0, 6).map((ex) => (
              <button
                key={ex}
                onClick={() => submit(ex)}
                className="rounded-full border border-border/70 bg-surface/40 px-3 py-1.5 text-[12.5px] text-dim transition-all hover:border-accent/50 hover:text-text"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
