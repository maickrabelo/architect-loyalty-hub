-- Adicionar coluna de imagem na tabela premiacoes
ALTER TABLE public.premiacoes ADD COLUMN imagem_url TEXT;

-- Criar bucket para imagens de premiações
INSERT INTO storage.buckets (id, name, public)
VALUES ('premiacoes', 'premiacoes', true);

-- RLS Policies para o bucket premiacoes
CREATE POLICY "Imagens de premiações são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'premiacoes');

CREATE POLICY "Gestores podem fazer upload de imagens"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'premiacoes' AND
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Gestores podem atualizar imagens"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'premiacoes' AND
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Gestores podem deletar imagens"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'premiacoes' AND
  has_role(auth.uid(), 'gestor'::app_role)
);