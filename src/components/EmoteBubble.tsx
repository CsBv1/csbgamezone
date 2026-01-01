import { useEffect, useState } from "react";

interface EmoteBubbleProps {
  emote: string;
  x: number;
  y: number;
  username?: string;
}

export function EmoteBubble({ emote, x, y, username }: EmoteBubbleProps) {
  const [opacity, setOpacity] = useState(1);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    // Animate floating up and fading out
    const startTime = Date.now();
    const duration = 2500;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        setOffsetY(-progress * 60); // Float up 60px
        setOpacity(1 - progress * 0.8); // Fade to 20% opacity
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  return (
    <div
      className="absolute pointer-events-none z-30 flex flex-col items-center animate-in fade-in duration-300"
      style={{
        left: x,
        top: y + offsetY - 60,
        opacity,
        transform: "translateX(-50%)",
      }}
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-white/50">
        <span className="text-2xl">{emote}</span>
      </div>
      {username && (
        <span className="text-xs text-white/80 mt-1 font-medium drop-shadow-lg">
          {username}
        </span>
      )}
    </div>
  );
}
