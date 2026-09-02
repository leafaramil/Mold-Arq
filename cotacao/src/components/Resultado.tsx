"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { fmt, round2 } from "@/lib/format";
import { rotuloUnidade } from "@/lib/unidades";
import { precoPorKg } from "@/lib/peso";
import type { Action } from "@/lib/action-types";
import type { MercadoId } from "@/lib/matching";
import type { CandidatoProduto, ItemNoMercado, ResultadoCotacao } from "@/lib/types";
import { Btn, Card, Topo } from "./ui";

// mercadoId+itemId -> índice do candidato escolhido (null = "não encontrado"/nenhum serve).
// Começa com a escolha da IA (resultado.mercados[].itens[].escolhaIndex) e o
// usuário pode trocar tocando no item — tudo recalculado no cliente, sem
// pedir uma cotação nova ao servidor.
type Escolhas = Record<string, number | null>;

function chave(mercadoId: string, itemId: string): string {
  return `${mercadoId}:${itemId}`;
}

// Item "kg" (vendido a peso solto — açougue, hortifruti) precisa normalizar
// o preço encontrado pra "por kg" antes de multiplicar: cada mercado pode
// listar o produto num pacote de tamanho diferente (100g, 1kg, "Kg" solto
// vendido a peso variável...), então o preço bruto não é comparável entre
// mercados. Quando não dá pra identificar o peso no nome do produto, cai
// pro comportamento antigo (preço bruto × quantidade) com um aviso na tela.
function calcularSubtotal(item: ItemNoMercado, candidato: CandidatoProduto): { valor: number; pesoNaoIdentificado: boolean } {
  if (item.unidade === "kg") {
    const porKg = precoPorKg(candidato.preco, candidato.nome);
    if (porKg != null) return { valor: round2(porKg * item.quantidade), pesoNaoIdentificado: false };
    return { valor: round2(candidato.preco * item.quantidade), pesoNaoIdentificado: true };
  }
  return { valor: round2(candidato.preco * item.quantidade), pesoNaoIdentificado: false };
}

export function Resultado({
  resultado,
  listaId,
  dispatch,
  onIrAjustes,
  onClose,
}: {
  resultado: ResultadoCotacao;
  listaId: string;
  dispatch: (action: Action) => void;
  onIrAjustes: () => void;
  onClose: () => void;
}) {
  const [escolhas, setEscolhas] = useState<Escolhas>(() => {
    const inicial: Escolhas = {};
    for (const m of resultado.mercados) {
      for (const item of m.itens) inicial[chave(m.mercadoId, item.itemId)] = item.escolhaIndex;
    }
    return inicial;
  });
  const [pickerAberto, setPickerAberto] = useState<string | null>(null);

  // A cotação já chega salva (page.tsx salva assim que /api/cotar responde)
  // — só precisa persistir de novo quando o usuário troca uma escolha aqui.
  // A flag evita salvar de novo no primeiro render, que já reflete o que
  // está salvo.
  const primeiraRenderizacao = useRef(true);
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    const resultadoAtualizado: ResultadoCotacao = {
      ...resultado,
      mercados: resultado.mercados.map((m) => ({
        ...m,
        itens: m.itens.map((item) => ({ ...item, escolhaIndex: escolhas[chave(m.mercadoId, item.itemId)] ?? null })),
      })),
    };
    dispatch({ type: "salvarCotacao", listaId, resultado: resultadoAtualizado });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolhas]);

  const totais = useMemo(() => {
    const t: Record<string, number> = {};
    for (const m of resultado.mercados) {
      let total = 0;
      for (const item of m.itens) {
        const idx = escolhas[chave(m.mercadoId, item.itemId)];
        if (idx != null) total = round2(total + calcularSubtotal(item, item.candidatos[idx]).valor);
      }
      t[m.mercadoId] = total;
    }
    return t;
  }, [resultado, escolhas]);

  const menorTotal = Math.min(...resultado.mercados.filter((m) => !m.erro).map((m) => totais[m.mercadoId]));
  const ordenados = [...resultado.mercados].sort((a, b) => totais[a.mercadoId] - totais[b.mercadoId]);

  function escolher(mercadoId: MercadoId, itemId: string, idx: number | null) {
    setEscolhas((atual) => ({ ...atual, [chave(mercadoId, itemId)]: idx }));
    setPickerAberto(null);
  }

  return (
    <div>
      <Topo titulo="Resultado da cotação" sub={new Date(resultado.geradoEm).toLocaleString("pt-BR")} onClose={onClose} />

      {ordenados.map((m) => {
        const total = totais[m.mercadoId];
        const maisBarato = !m.erro && total === menorTotal;
        const naoEncontrados = m.itens.filter((item) => escolhas[chave(m.mercadoId, item.itemId)] == null);
        const encontrados = m.itens.filter((item) => escolhas[chave(m.mercadoId, item.itemId)] != null);

        return (
          <Card key={m.mercadoId} style={maisBarato ? { border: `2px solid ${T.green}`, background: T.greenSoft } : undefined}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontFamily: fontSerif, fontSize: 16, fontWeight: 600, color: T.ink }}>
                {m.mercadoNome} {maisBarato && "🏆"}
              </div>
              <div style={{ fontFamily: fontSerif, fontSize: 19, fontWeight: 700, color: maisBarato ? T.green : T.ink }}>{fmt(total)}</div>
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
              {encontrados.length} de {m.itens.length} itens encontrados — toque num item pra trocar a escolha
            </div>

            <div style={{ marginTop: 10, borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
              {[...naoEncontrados, ...encontrados].map((item) => {
                const k = chave(m.mercadoId, item.itemId);
                const idx = escolhas[k];
                const aberto = pickerAberto === k;
                const sub = idx != null ? calcularSubtotal(item, item.candidatos[idx]) : null;
                return (
                  <div key={item.itemId} style={{ marginBottom: 4 }}>
                    <div
                      onClick={() => setPickerAberto(aberto ? null : k)}
                      style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 12.5, cursor: "pointer" }}
                    >
                      <div>
                        <div style={{ color: idx == null ? T.inkSoft : T.ink, textDecoration: idx == null ? "line-through" : "none" }}>
                          {idx == null ? item.itemTexto : item.candidatos[idx].nome}
                        </div>
                        {idx != null && sub && (
                          <div style={{ color: T.inkSoft, fontSize: 10.5 }}>
                            {item.unidade === "kg"
                              ? sub.pesoNaoIdentificado
                                ? `${item.quantidade} ${rotuloUnidade(item.unidade)} × ${fmt(item.candidatos[idx].preco)} (peso não identificado — preço bruto)`
                                : `${item.quantidade} kg × ${fmt(sub.valor / item.quantidade)}/kg (normalizado)`
                              : `${item.quantidade} ${rotuloUnidade(item.unidade)} × ${fmt(item.candidatos[idx].preco)}`}
                          </div>
                        )}
                      </div>
                      <div style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                        {idx == null || !sub ? (
                          <span style={{ color: T.brick, fontSize: 11 }}>não encontrado</span>
                        ) : (
                          <span style={{ color: T.ink, fontWeight: 700 }}>{fmt(sub.valor)}</span>
                        )}
                        <span style={{ color: T.inkSoft, fontSize: 10 }}>{aberto ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {aberto && (
                      <div style={{ background: T.paper, borderRadius: 10, padding: 8, marginBottom: 6 }}>
                        {item.candidatos.length === 0 && <div style={{ fontSize: 11.5, color: T.inkSoft, padding: "4px 2px" }}>Nenhum resultado de busca nesse mercado.</div>}
                        {item.candidatos.map((c, i) => {
                          const porKg = item.unidade === "kg" ? precoPorKg(c.preco, c.nome) : null;
                          return (
                          <div
                            key={i}
                            onClick={() => escolher(m.mercadoId, item.itemId, i)}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              padding: "7px 6px",
                              fontSize: 12,
                              borderRadius: 8,
                              cursor: "pointer",
                              background: idx === i ? T.greenSoft : "transparent",
                              color: T.ink,
                            }}
                          >
                            <div>{c.nome}</div>
                            <div style={{ whiteSpace: "nowrap", fontWeight: idx === i ? 700 : 400 }}>
                              {fmt(c.preco)}
                              {porKg != null && <span style={{ color: T.inkSoft, fontWeight: 400 }}> ({fmt(porKg)}/kg)</span>}
                            </div>
                          </div>
                          );
                        })}
                        <div
                          onClick={() => escolher(m.mercadoId, item.itemId, null)}
                          style={{ padding: "7px 6px", fontSize: 11.5, borderRadius: 8, cursor: "pointer", color: T.brick, background: idx == null ? T.brickSoft : "transparent" }}
                        >
                          Nenhum serve — marcar como não encontrado
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
