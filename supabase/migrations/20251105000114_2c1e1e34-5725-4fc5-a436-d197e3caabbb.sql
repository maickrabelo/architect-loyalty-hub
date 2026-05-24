-- Criar enum para tipos de usuário
CREATE TYPE public.app_role AS ENUM ('arquiteto', 'empresa', 'gestor');

-- Criar enum para sexo
CREATE TYPE public.sexo_type AS ENUM ('masculino', 'feminino', 'outro', 'prefiro_nao_informar');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  nome_divulgacao TEXT,
  cnpj_cpf TEXT,
  rg TEXT,
  nascimento DATE,
  sexo sexo_type,
  telefone TEXT,
  celular TEXT,
  instagram TEXT,
  facebook TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  complemento TEXT,
  cidade TEXT,
  estado TEXT,
  apresentacao TEXT,
  observacao TEXT,
  profissao TEXT,
  imagem_profissional TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de roles de usuário (separada)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Tabela de empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de vendas
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  arquiteto_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  valor_venda DECIMAL(10,2) NOT NULL,
  pontos_calculados INTEGER NOT NULL,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de premiações
CREATE TABLE public.premiacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  pontos_necessarios INTEGER NOT NULL,
  ativa BOOLEAN DEFAULT TRUE,
  ordem INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes ENABLE ROW LEVEL SECURITY;

-- Função para verificar role do usuário (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para criar perfil quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Gestores podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'gestor'));

-- RLS Policies para user_roles
CREATE POLICY "Usuários podem ver suas próprias roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Gestores podem gerenciar roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

-- RLS Policies para empresas
CREATE POLICY "Empresas podem ver seu próprio registro"
  ON public.empresas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Empresas podem atualizar seu próprio registro"
  ON public.empresas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Empresas podem inserir seu próprio registro"
  ON public.empresas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gestores podem ver todas as empresas"
  ON public.empresas FOR SELECT
  USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Arquitetos podem ver empresas"
  ON public.empresas FOR SELECT
  USING (public.has_role(auth.uid(), 'arquiteto'));

-- RLS Policies para vendas
CREATE POLICY "Empresas podem inserir vendas"
  ON public.vendas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE id = empresa_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Empresas podem ver suas vendas"
  ON public.vendas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE id = empresa_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Empresas podem atualizar suas vendas"
  ON public.vendas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE id = empresa_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Empresas podem deletar suas vendas"
  ON public.vendas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE id = empresa_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Arquitetos podem ver suas vendas"
  ON public.vendas FOR SELECT
  USING (auth.uid() = arquiteto_id);

CREATE POLICY "Gestores podem ver todas as vendas"
  ON public.vendas FOR SELECT
  USING (public.has_role(auth.uid(), 'gestor'));

-- RLS Policies para premiações
CREATE POLICY "Todos podem ver premiações ativas"
  ON public.premiacoes FOR SELECT
  USING (ativa = TRUE);

CREATE POLICY "Gestores podem gerenciar premiações"
  ON public.premiacoes FOR ALL
  USING (public.has_role(auth.uid(), 'gestor'));

-- Inserir premiações iniciais
INSERT INTO public.premiacoes (nome, descricao, pontos_necessarios, ordem) VALUES
('Bronze', 'Premiação Bronze', 1000, 1),
('Prata', 'Premiação Prata', 3000, 2),
('Ouro', 'Premiação Ouro', 5000, 3),
('Platina', 'Premiação Platina', 10000, 4),
('Diamante', 'Premiação Diamante', 20000, 5);

-- Criar índices para performance
CREATE INDEX idx_vendas_empresa_id ON public.vendas(empresa_id);
CREATE INDEX idx_vendas_arquiteto_id ON public.vendas(arquiteto_id);
CREATE INDEX idx_vendas_data_venda ON public.vendas(data_venda);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_empresas_user_id ON public.empresas(user_id);