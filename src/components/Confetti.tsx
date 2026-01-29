import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  rotation: number;
  scale: number;
  color: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--income))",
  "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(330, 70%, 55%)",
];

const SHAPES = ["●", "■", "▲", "★", "♦"];

export function Confetti({ 
  isActive, 
  duration = 2500,
  particleCount = 25
}: { 
  isActive: boolean;
  duration?: number;
  particleCount?: number;
}) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.3,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => setPieces([]), duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration, particleCount]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                opacity: 1,
                x: `${piece.x}vw`,
                y: -20,
                rotate: 0,
                scale: piece.scale,
              }}
              animate={{
                opacity: [1, 1, 0],
                y: "110vh",
                rotate: piece.rotation + 720,
                x: `${piece.x + (Math.random() - 0.5) * 20}vw`,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2 + Math.random(),
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{ color: piece.color, willChange: "transform" }}
              className="absolute text-lg"
            >
              {SHAPES[piece.id % SHAPES.length]}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
