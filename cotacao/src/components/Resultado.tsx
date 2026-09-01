"use client";

import { T, fontSerif } from "@/lib/theme";
import { fmt } from "@/lib/format";
import type { ResultadoCotacao } from "@/lib/types";
import { Btn, Card, Tit, Topo } from "./ui";

export function Resultado({ resultado, onIrAjustes, onClose }: { resultado: ResultadoCotacao; onIrAjustes: () => void; onClose: () => void }) {
  const ordenados = [...resultado.mercados].sort((a, b) => a.total - b.total);
  const menorTotal = ordenados.find((m) => !m.erro)?.total;

  return (
    <div>
      <Topo titulo="Resultado da cotação" sub={new Date(resultado.geradoEm).toLocaleString("pt-BR")} onClose={onClose} />

      {ordenados.map((m) => {
        const maisBarato = menorTotal != null && !m.erro && m.total === menorTotal;
        return (
          <Card key={m.mercadoId} style={maisBarato ? { border: `2px solid ${T.green}`, background: T.greenSoft } : undefined}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div style={{ fontFamily: fontSerif, fontSize: 16, fontWeight: 600, color: T.ink }}>
                {m.mercadoNome} {maisBarato && "🏆"}
              </div>
              <div style={{ fontFamily: fontSerif, fontSize: 19, fontWeight: 700, color: maisBarato ? T.green : T.ink }}>{fmt(m.total)}</div>
            </div>

            {m.tokenExpirado && (
              <div
                onClick={onIrAjustes}
                style={{ fontSize: 11.5, color: T.brick, background: T.brickSoft, borderRadius: 8, padding: "7px 10px", marginBottom: 8, cursor: "pointer" }}
              >
                Token do Shibata expirado — toque para atualizar em Ajustes.
              </div>
            )}
            {m.erro && !m.tokenExpirado && (
              <div style={{ fontSize: 11.5, color: T.brick, background: T.brickSoft, borderRadius: 8, padding: "7px 10px", marginBottom: 8 }}>
                Não deu pra consultar esse mercado agora ({m.erro}).
              </div>
            )}

            <div style={{ fontSize: 11.5, color: T.inkSoft }}>
              {m.encontrados.length} de {m.encontrados.length + m.naoEncontrados.length} itens encontrados
            </div>

            {m.naoEncontrados.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Tit>Não encontrados aqui</Tit>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {m.naoEncontrados.map((texto, i) => (
                    <span key={i} style={{ fontSize: 11.5, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 20, padding: "3px 10px", color: T.inkSoft }}>
                      {texto}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <div style={{ marginTop: 10 }}>
        <Btn v="ghost" onClick={onClose}>
          Voltar pra lista
        </Btn>
      </div>
    </div>
  );
}
