export type Destino = {
  nome: string;
  pontos: number;
  local: string;
};

/** Destinos e pontuações oficiais da Campanha Conexão 2026 */
export const DESTINOS: Destino[] = [
  { nome: "Club Med Lake Paradise", pontos: 400, local: "Brasil" },
  { nome: "Buenos Aires", pontos: 550, local: "Argentina" },
  { nome: "Fasano Boa Vista", pontos: 800, local: "Brasil" },
  { nome: "Amazônia", pontos: 1200, local: "Brasil" },
  { nome: "Fernando de Noronha", pontos: 1600, local: "Brasil" },
  { nome: "Atacama", pontos: 2000, local: "Chile" },
  { nome: "Portugal", pontos: 2500, local: "Europa" },
  { nome: "Egito", pontos: 3000, local: "África" },
  { nome: "África do Sul", pontos: 4000, local: "África" },
  { nome: "Tailândia", pontos: 5000, local: "Ásia" },
  { nome: "Japão", pontos: 6000, local: "Ásia" },
];

/** Última faixa conquistada com base nos pontos acumulados */
export const destinoAtual = (pontos: number): Destino | null =>
  [...DESTINOS].reverse().find((d) => pontos >= d.pontos) ?? null;

/** Próxima faixa a conquistar */
export const proximoDestino = (pontos: number): Destino | null =>
  DESTINOS.find((d) => d.pontos > pontos) ?? null;
