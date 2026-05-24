import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: arquitetos = [], isLoading: isLoadingArquitetos } = useQuery({
    queryKey: ['arquitetos'],
    queryFn: async () => {
      // Primeiro buscar IDs de usuários com role 'arquiteto'
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'arquiteto');
      
      if (rolesError) throw rolesError;
      if (!rolesData || rolesData.length === 0) return [];

      const arquitetosIds = rolesData.map(r => r.user_id);

      // Buscar perfis dos arquitetos
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', arquitetosIds);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: vendas = [], isLoading: isLoadingVendas } = useQuery({
    queryKey: ['vendas', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      
      const { data, error } = await supabase
        .from('vendas')
        .select(`
          *,
          profiles!vendas_arquiteto_id_fkey(nome)
        `)
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
      vendasTotal,
      ultimoCliente: ultimaVenda?.observacao || 'Sem vendas',
      ultimaPremiacaoConquistada: Math.floor(vendasTotal / 1000) >= 1000 ? 1000 : 
                                   Math.floor(vendasTotal / 1000) >= 500 ? 500 : 0
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
