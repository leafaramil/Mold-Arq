"use client";

import { T, fontSerif } from "@/lib/theme";
import { fmt } from "@/lib/format";
import { nomeMes, textoAviso } from "@/lib/calc";
import type { Aviso, LivreBreakdown } from "@/lib/types";

export type Tela = "home" | "calendario" | "aristides" | "despesas" | "receitas" | "ajustes";

const ICONES: { id: Tela; i: string; l: string }[] = [
  { id: "calendario", i: "📅", l: "Calendário" },
  { id: "aristides", i: "🎩", l: "Aristides" },
  { id: "despesas", i: "📄", l: "Despesas" },
  { id: "receitas", i: "💰", l: "Receitas" },
  { id: "ajustes", i: "⚙️", l: "Ajustes" },
];

export function Home({
  nome,
  assistente,
  mes,
  livre,
  avisos,
  onboardingVisivel,
  onDispensarOnboarding,
  onDispensarAviso,
  onIr,
}: {
  nome: string;
  assistente: string;
  mes: string;
  livre: LivreBreakdown;
  avisos: Aviso[];
  onboardingVisivel: boolean;
  onDispensarOnboarding: () => void;
  onDispensarAviso: (chave: string) => void;
  onIr: (tela: Tela) => void;
}) {
  const icones = ICONES.map((ic) => (ic.id === "aristides" ? { ...ic, l: assistente } : ic));

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: fontSerif, fontSize: 24, fontWeight: 600, color: T.ink }}>Olá, {nome}</div>
        <div style={{ fontSize: 12, color: T.inkSoft }}>
          {nomeMes(mes)} · hoje é dia {new Date().getDate()}
        </div>
      </div>

      {onboardingVisivel && (
        <div style={{ background: T.goldSoft, borderRadius: 14, padding: "12px 14px", marginBottom: 12, position: "relative" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7A5A20", marginBottom: 4 }}>Antes de começar</div>
          <div style={{ fontSize: 11.5, color: "#7A5A20", lineHeight: 1.5 }}>
            Se já tem dinheiro separado no Nubank pra alguma conta, use &quot;Separar&quot; nela no Calendário. Se já usa o
            ZUL, informe o saldo atual em Ajustes. Assim o &quot;livre para gastar&quot; reflete o que realmente está livre.
          </div>
          <div onClick={onDispensarOnboarding} style={{ position: "absolute", top: 10, right: 12, cursor: "pointer", fontSize: 13, color: "#7A5A20", fontWeight: 700 }}>
            ✕
          </div>
        </div>
      )}

      <div style={{ background: livre.livre >= 0 ? T.ink : T.brick, borderRadius: 20, padding: "18px 20px", marginBottom: 10 }}>
        <div style={{ fontSize: 10.5, color: "#D5DAD2", fontWeight: 700, letterSpacing: "0.05em" }}>LIVRE PARA GASTAR</div>
        <div style={{ fontFamily: fontSerif, fontSize: 36, fontWeight: 600, color: T.paper, marginTop: 2 }}>{fmt(livre.livre)}</div>
        <div style={{ fontSize: 10.5, color: "#D5DAD2", marginTop: 3 }}>depois de tudo pago ou separado</div>
      </div>

      {avisos.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {avisos.slice(0, 4).map((a) => (
            <div
              key={a.chave}
              style={{
                background: a.dias < 0 ? T.brickSoft : T.goldSoft,
                borderRadius: 12,
                padding: "9px 12px",
                marginBottom: 5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11.5, color: a.dias < 0 ? "#7A3D2C" : "#7A5A20", fontWeight: 600 }}>
                {a.icone} {a.nome} — {textoAviso(a.dias)}
              </span>
              <span
                onClick={() => onDispensarAviso(a.chave)}
                style={{ cursor: "pointer", fontSize: 13, color: a.dias < 0 ? "#7A3D2C" : "#7A5A20", padding: "0 4px", fontWeight: 700 }}
              >
                ✕
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 7, marginBottom: 20 }}>
        {(
          [
            ["Recebido", livre.recebido, T.sage],
            ["Separado", livre.separado, T.blue],
            ["Pago", livre.pago, T.brick],
          ] as const
        ).map(([l, v, cor]) => (
          <div key={l} style={{ flex: 1, background: T.raised, border: `1px solid ${T.line}`, borderRadius: 12, padding: "9px 5px", textAlign: "center" }}>
            <div style={{ fontFamily: fontSerif, fontSize: 13, color: cor, fontWeight: 600 }}>{fmt(v)}</div>
            <div style={{ fontSize: 9.5, color: T.inkSoft, fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {icones.map((ic) => (
          <div
            key={ic.id}
            onClick={() => onIr(ic.id)}
            style={{
              background: T.raised,
              border: `1px solid ${T.line}`,
              borderRadius: 18,
              padding: "24px 8px 18px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <div style={{ width: 54, height: 54, borderRadius: 16, background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27 }}>
              {ic.i}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, textAlign: "center" }}>{ic.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
