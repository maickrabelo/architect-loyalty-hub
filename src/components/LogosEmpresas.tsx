import eletroFonte from "@/assets/logos-empresas/LOGO_HORIZONTAL_ELETRO_NOVA.png";
import rogerioMarzola from "@/assets/logos-empresas/ROGERIO_MARZOLA_copiar.png";
import shoppingPedras from "@/assets/logos-empresas/SHOPPING_DAS_PEDRAS_copiar.png";
import suaCasaSmart from "@/assets/logos-empresas/SUA_CASA_SMART.png";
import todeschini from "@/assets/logos-empresas/TODESCHINI_copiar.png";
import tomazini from "@/assets/logos-empresas/TOMAZINI_TINTAS.png";
import anjosColchoes from "@/assets/logos-empresas/ANJOS_COLCHOES_copiar.png";
import antonelli from "@/assets/logos-empresas/ANTONELLI.png";
import carreMarmoraria from "@/assets/logos-empresas/CARRÉ_MARMORARIA_copiar.png";
import casaDecor from "@/assets/logos-empresas/CASA_DECOR.png";
import designCenter from "@/assets/logos-empresas/DESIGN_CENTER.png";
import hidraulicaUberaba from "@/assets/logos-empresas/HIDRÁULICA_UBERABA_copiar.png";
import lojaSaoGeraldo from "@/assets/logos-empresas/LOJA_SAO_GERALDO_copiar.png";
import pindorama from "@/assets/logos-empresas/PINDORAMA_copiar.png";
import poolHouse from "@/assets/logos-empresas/Pool_House.png";
import reginez from "@/assets/logos-empresas/REGINEZ_copiar.png";

// Ordem alfabética. Novas logos: adicionar aqui e reordenar.
const logos = [
  { nome: "Anjos Colchões", url: anjosColchoes },
  { nome: "Antonelli", url: antonelli },
  { nome: "Carré Marmoraria", url: carreMarmoraria },
  { nome: "Casa Decor", url: casaDecor },
  { nome: "Design Center", url: designCenter },
  { nome: "Eletro Fonte", url: eletroFonte },
  { nome: "Hidráulica Uberaba", url: hidraulicaUberaba },
  { nome: "Loja São Geraldo", url: lojaSaoGeraldo },
  { nome: "Pindorama", url: pindorama },
  { nome: "Pool House", url: poolHouse },
  { nome: "Reginez", url: reginez },
  { nome: "Rogério Marzola", url: rogerioMarzola },
  { nome: "Shopping das Pedras", url: shoppingPedras },
  { nome: "Sua Casa Smart", url: suaCasaSmart },
  { nome: "Todeschini", url: todeschini },
  { nome: "Tomazini Tintas", url: tomazini },
];

export function LogosEmpresas() {
  // Lista duplicada para o loop infinito do marquee
  const faixa = [...logos, ...logos];

  return (
    <section className="py-16 relative overflow-hidden">
      <style>{`
        @keyframes logos-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .logos-marquee-track {
          animation: logos-marquee 40s linear infinite;
        }
        .logos-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="container mx-auto px-4 mb-10">
        <p className="text-center text-[0.7rem] tracking-[0.3em] uppercase text-muted-foreground">
          Empresas participantes
        </p>
      </div>

      <div className="relative">
        {/* Fade nas bordas */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 z-10 bg-gradient-to-l from-background to-transparent" />

        <div className="overflow-hidden">
          <div className="logos-marquee-track flex w-max items-center">
            {faixa.map((logo, i) => (
              <div
                key={`${logo.nome}-${i}`}
                className="flex-shrink-0 px-3 sm:px-6 w-[33.333vw] sm:w-[20vw]"
              >
                <div className="flex h-20 sm:h-24 items-center justify-center rounded-2xl border border-border bg-primary-deep px-6">
                  <img
                    src={logo.url}
                    alt={logo.nome}
                    loading="lazy"
                    className="max-h-12 sm:max-h-14 w-auto max-w-full object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
