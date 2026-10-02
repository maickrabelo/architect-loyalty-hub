import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ProfessionalPhoto = {
  id: string;
  imagem_profissional: string | null;
};

const useProfessionalPhotos = () =>
  useQuery({
    queryKey: ["professional-avatar-photos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_profissionais_publicos");
      if (error) throw error;

      const professionals = (data || []) as ProfessionalPhoto[];
      const entries = await Promise.all(
        professionals.map(async (professional) => {
          const path = professional.imagem_profissional;
          if (!path || /^https?:\/\//.test(path)) return [professional.id, path] as const;

          const { data: signed } = await supabase.storage
            .from("fotos-profissionais")
            .createSignedUrl(path, 3600);
          return [professional.id, signed?.signedUrl || null] as const;
        }),
      );

      return new Map(entries);
    },
    staleTime: 45 * 60 * 1000,
  });

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "P";

export function ProfessionalAvatar({
  professionalId,
  name,
  imagePath,
  className,
}: {
  professionalId: string;
  name: string;
  imagePath?: string | null;
  className?: string;
}) {
  const { data: photos } = useProfessionalPhotos();
  const image = imagePath && /^https?:\/\//.test(imagePath)
    ? imagePath
    : photos?.get(professionalId) || undefined;

  return (
    <Avatar className={cn("h-9 w-9 border border-border bg-background", className)}>
      <AvatarImage src={image || undefined} alt={`Foto de ${name}`} className="object-cover" />
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function ProfessionalName({
  professionalId,
  name,
  imagePath,
  className,
}: {
  professionalId: string;
  name: string;
  imagePath?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <ProfessionalAvatar professionalId={professionalId} name={name} imagePath={imagePath} />
      <span className="min-w-0 truncate">{name}</span>
    </div>
  );
}