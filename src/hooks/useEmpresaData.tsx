import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ProfissionalPublico = {
  id: string;
  nome: string | null;
  nome_divulgacao: string | null;
  profissao: string | null;
  cidade: string | null;
  estado: string | null;
  imagem_profissional: string | null;
};

export const useEmpresaData = () => {
  const { user } = useAuth();

  const { data: empresa, isLoading: isLoadingEmpresa } = useQuery({
    queryKey: ['empresa', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: arquitetos = [], isLoading: isLoadingArquitetos } = useQuery({
    queryKey: ['arquitetos'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc('get_profissionais_publicos');
      
      if (error) throw error;
      return (data || []) as ProfissionalPublico[];
    },
    enabled: !!user,
  });

  const { data: vendas = [], isLoading: isLoadingVendas } = useQuery({
    queryKey: ['vendas', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('data_venda', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!empresa,
  });

  // Calculate totals
  const vendasDoMes = vendas.filter(v => {
    const dataVenda = new Date(v.data_venda);
    const hoje = new Date();
    return dataVenda.getMonth() === hoje.getMonth() && 
           dataVenda.getFullYear() === hoje.getFullYear();
  });

  const vendasTotaisMes = vendasDoMes.reduce((sum, v) => sum + Number(v.valor_venda), 0);

  // Calculate by architect
  const arquitetosComVendas = arquitetos.map(arq => {
    const vendasArquiteto = vendas.filter(v => v.arquiteto_id === arq.id);
    const vendasTotal = vendasArquiteto.reduce((sum, v) => sum + Number(v.valor_venda), 0);
    const ultimaVenda = vendasArquiteto[0];
    
    return {
      ...arq,
      nome: arq.nome_divulgacao || arq.nome || 'Profissional sem nome',
      vendasTotal,
      ultimoCliente: ultimaVenda?.observacao || 'Sem vendas',
      ultimaPremiacaoConquistada: destinoAtual(Math.floor(vendasTotal / 1000))?.pontos ?? 0,
      destinoAtual: destinoAtual(Math.floor(vendasTotal / 1000))?.nome ?? null,

    };
  });

  return {
    empresa,
    arquitetos: arquitetosComVendas,
    vendas,
    vendasTotaisMes,
    totalArquitetos: arquitetos.length,
    isLoading: isLoadingEmpresa || isLoadingArquitetos || isLoadingVendas,
  };
};
