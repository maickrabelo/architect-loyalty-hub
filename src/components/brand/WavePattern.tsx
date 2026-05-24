import { cn } from "@/lib/utils";

interface WavePatternProps {
  className?: string;
  variant?: "horizontal" | "divider";
  opacity?: number;
}

/**
 * Padrão de ondas orgânicas inspirado na peça Conexão.
 * Linhas finas em primary-deep que se repetem horizontalmente.
 */
export const WavePattern = ({ className, variant = "horizontal", opacity = 0.45 }: WavePatternProps) => {
  if (variant === "divider") {
    return (
      <div className={cn("flex items-center gap-4 w-full", className)}>
        <div className="h-px flex-1 bg-border" />
        <svg
          width="80"
          height="14"
          viewBox="0 0 80 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity }}
        >
          <path
            d="M0 7 Q 10 0, 20 7 T 40 7 T 60 7 T 80 7"
            stroke="hsl(var(--primary-deep))"
            strokeWidth="1"
            fill="none"
          />
        </svg>
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return (
    <svg
      className={cn("w-full h-auto", className)}
      viewBox="0 0 1200 80"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
      aria-hidden
    >
      {[0, 14, 28, 42].map((y, i) => (
        <path
          key={i}
          d={`M0 ${20 + y} Q 30 ${5 + y}, 60 ${20 + y} T 120 ${20 + y} T 180 ${20 + y} T 240 ${20 + y} T 300 ${20 + y} T 360 ${20 + y} T 420 ${20 + y} T 480 ${20 + y} T 540 ${20 + y} T 600 ${20 + y} T 660 ${20 + y} T 720 ${20 + y} T 780 ${20 + y} T 840 ${20 + y} T 900 ${20 + y} T 960 ${20 + y} T 1020 ${20 + y} T 1080 ${20 + y} T 1140 ${20 + y} T 1200 ${20 + y}`}
          stroke="hsl(var(--primary-deep))"
          strokeWidth="0.8"
          fill="none"
          opacity={1 - i * 0.18}
        />
      ))}
    </svg>
  );
};
