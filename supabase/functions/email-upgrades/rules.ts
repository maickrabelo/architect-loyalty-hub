export type UpgradeEmail = {
  id: string;
  email: string;
  nome: string;
  de_nivel: string;
  para_nivel: string;
  pontos: number;
  data_upgrade: string;
  tentativas: number;
};

export const retryDelayMinutes = (attempts: number) => Math.min(1440, 2 ** Math.min(attempts, 11));

export const upgradeSubject = (row: UpgradeEmail) => `${row.nome} conquistou ${row.para_nivel} — Grupo Conexão`;