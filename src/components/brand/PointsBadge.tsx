import { cn } from "@/lib/utils";

interface PointsBadgeProps {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "mocha" | "terracotta" | "outline";
  className?: string;
}

/**
 * Selo circular de pontos: dois círculos concêntricos finos,
 * pequeno ponto-satélite e número grande dentro.
 */
export const PointsBadge = ({
  value,
  label = "PONTOS",
  size = "md",
  variant = "mocha",
  className,
}: PointsBadgeProps) => {
  const sizeMap = {
    sm: { box: "w-20 h-20", num: "text-xl", lbl: "text-[8px]" },
    md: { box: "w-32 h-32", num: "text-3xl", lbl: "text-[10px]" },
    lg: { box: "w-44 h-44", num: "text-5xl", lbl: "text-xs" },
  }[size];

  const fillClass =
    variant === "mocha"
      ? "bg-gradient-mocha text-primary-foreground"
      : variant === "terracotta"
      ? "bg-gradient-terracotta text-primary-foreground"
      : "bg-card text-foreground";

  return (
    <div className={cn("relative inline-flex items-center justify-center", sizeMap.box, className)}>
      {/* Anel externo fino */}
      <div className="absolute inset-0 rounded-full border border-primary-deep/40" />
      {/* Ponto satélite */}
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-deep" />
      {/* Círculo preenchido */}
      <div
        className={cn(
          "absolute inset-2 rounded-full flex flex-col items-center justify-center",
          fillClass,
        )}
      >
        <span className={cn("font-serif font-medium leading-none", sizeMap.num)}>{value.toLocaleString()}</span>
        <span
          className={cn("font-sans uppercase mt-0.5 opacity-90", sizeMap.lbl)}
          style={{ letterSpacing: "0.25em" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
