import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const mesAtual = () => new Date().toISOString().slice(0, 7);

export const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export const labelMes = (mes: string) => {
  if (!mes) return "";
  const [ano, m] = mes.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(m) - 1]}/${ano}`;
};

export const listaMeses = (quantidade = 24) => {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < quantidade; i++) {
    out.push(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
};

export const useConfigFinanceira = () =>
  useQuery({
    queryKey: ["config-financeira"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_financeiras")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useEmpresasFinanceiro = () =>
  useQuery({
    queryKey: ["empresas-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, bloqueada, motivo_bloqueio, email")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

export const useFaturas = (mes?: string) =>
  useQuery({
    queryKey: ["faturas", mes ?? "todas"],
    queryFn: async () => {
      let q = supabase
        .from("faturas")
        .select("*, empresas(nome)")
        .order("mes", { ascending: false });
      if (mes) q = q.eq("mes", mes);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

export const useCaixa = (mes: string) =>
  useQuery({
    queryKey: ["caixa", mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixas_mensais")
        .select("*")
        .eq("mes", mes)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useMovimentacoes = (mes: string) =>
  useQuery({
    queryKey: ["movimentacoes", mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_financeiras")
        .select("*, empresas(nome)")
        .eq("mes", mes)
        .order("data", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useSaldoCampanha = () =>
  useQuery({
    queryKey: ["saldo-campanha"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saldo_campanha")
        .select("*, empresas(nome)")
        .order("ano", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useCobrancasExtras = () =>
  useQuery({
    queryKey: ["cobrancas-extras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cobrancas_extras")
        .select("*, cobrancas_extras_empresas(id, empresa_id, valor_mensal, empresas(nome))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const useBloqueios = () =>
  useQuery({
    queryKey: ["bloqueios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bloqueios_empresa")
        .select("*, empresas(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

export const exportarCSV = (nome: string, linhas: Record<string, unknown>[]) => {
  if (!linhas.length) return;
  const headers = Object.keys(linhas[0]);
  const csv = [
    headers.join(";"),
    ...linhas.map((l) => headers.map((h) => String(l[h] ?? "").replace(/;/g, ",")).join(";")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
