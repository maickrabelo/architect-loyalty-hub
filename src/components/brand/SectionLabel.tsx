import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "muted";
}

export const SectionLabel = ({ children, className, variant = "default" }: SectionLabelProps) => (
  <span
    className={cn(
      variant === "muted" ? "label-tag-muted" : "label-tag",
      "block font-medium",
      className,
    )}
  >
    {children}
  </span>
);
