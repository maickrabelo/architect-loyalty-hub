import { cn } from "@/lib/utils";
import logoConexao from "@/assets/logo-conexao.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const Logo = ({ className, size = "md", showText = false }: LogoProps) => {
  const sizeMap = {
    sm: { img: "h-10", text: "text-base" },
    md: { img: "h-14", text: "text-xl" },
    lg: { img: "h-24", text: "text-3xl" },
  }[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logoConexao}
        alt="Grupo Conexão"
        className={cn("w-auto object-contain", sizeMap.img)}
      />
      {showText && (
        <span className={cn("font-serif font-medium tracking-tight text-foreground", sizeMap.text)}>
          Grupo Conexão
        </span>
      )}
    </div>
  );
};
