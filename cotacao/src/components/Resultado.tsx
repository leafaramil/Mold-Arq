"use client";

import { useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { fmt } from "@/lib/format";
import type { ResultadoCotacao } from "@/lib/types";
import { Btn, Card, Topo } from "./ui";

export function Resultado({ resultado, onIrAjustes, onClose }: { resultado: ResultadoCotacao; onIrAjustes: () => void; onClose: () => void }) {
  const ordenados = [...resultado.mercados].sort((a, b) => a.total - b.total);
  const menorTotal = ordenados.find((m) => !m.erro)?.total;
  const [expandido, setExpandido] = useState<string | null>(null);

  return (
    <div>
      <Topo titulo="Resultado da cotação" sub={new Date(resultado.geradoEm).toLocaleString("pt-BR")} onClose={onClose} />

      {ordenados.map((m) => {
        const maisBarato = menorTotal != null && !m.erro && m.total === menorTotal;
        const aberto = expandido === m.mercadoId;
        return (
          <Card key={m.mercadoId} style={maisBarato ? { border: `2px solid ${T.green}`, background: T.greenSoft } : undefined}>
            <div
              onClick={() => setExpandido(aberto ? null : m.mercadoId)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", cursor: "pointer" }}
            >
              <div style={{ fontFamily: fontSerif, fontSize: 16, fontWeight: 600, color: T.ink }}>
                {m.mercadoNome} {maisBarato && "🏆"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: fontSerif, fontSize: 19, fontWeight: 700, color: maisBarato ? T.green : T.ink }}>{fmt(m.total)}</div>
                <div style={{ fontSize: 12, color: T.inkSoft }}>{aberto ? "▲" : "▼"}</div>
              </div>
            </div>

            {m.tokenExpirado && (
              <div
                onClick={onIrAjustes}
                style={{ fontSize: 11.5, color: T.brick, background: T.brickSoft, borderRadius: 8, padding: "7px 10px", marginTop: 8, cursor: "pointer" }}
              >
                Token do Shibata expirado — toque para atualizar em Ajustes.
              </div>
            )}
            {m.erro && !m.tokenExpirado && (
              <div style={{ fontSize: 11.5, color: T.brick, background: T.brickSoft, borderRadius: 8, padding: "7px 10px", marginTop: 8 }}>
                Não deu pra consultar esse mercado agora ({m.erro}).
              </div>
            )}

            <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 8 }}>
              {m.encontrados.length} de {m.encontrados.length + m.naoEncontrados.length} itens encontrados
            </div>

            {aberto && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
                {m.naoEncontrados.map((texto, i) => (
                  <div
                    key={`nf-${i}`}
                    style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 12.5 }}
                  >
                    <div style={{ color: T.inkSoft, textDecoration: "line-through" }}>{texto}</div>
                    <div style={{ color: T.brick, fontSize: 11, whiteSpace: "nowrap" }}>não encontrado</div>
                  </div>
                ))}
                {m.encontrados.map((item) => (
                  <div
                    key={item.itemId}
                    style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 12.5 }}
                  >
                    <div style={{ color: T.ink }}>{item.produtoNome}</div>
                    <div style={{ color: T.ink, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(item.preco)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      <div style={{ marginTop: 10 }}>
        <Btn v="ghost" onClick={onClose}>
          Voltar pra listinha
        </Btn>
      </div>
    </div>
  );
}
