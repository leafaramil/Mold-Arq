"use client";

import { useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { formatarData, uid } from "@/lib/format";
import { rotuloUnidade, sugerirUnidade, UNIDADES, type Unidade } from "@/lib/unidades";
import type { Action } from "@/lib/action-types";
import type { Item, Lista as ListaType } from "@/lib/types";
import { Btn, Card } from "./ui";

export function Lista({
  lista,
  itens,
  cotando,
  dispatch,
  onCotar,
  onExcluida,
  onClose,
}: {
  lista: ListaType;
  itens: Item[];
  cotando: boolean;
  dispatch: (action: Action) => void;
  onCotar: () => void;
  onExcluida: () => void;
  onClose: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState<Unidade>("un");
  const [unidadeTocada, setUnidadeTocada] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  function aoMudarTexto(v: string) {
    setTexto(v);
    // sugere a unidade a partir do que foi digitado, só enquanto a pessoa
    // não tiver escolhido uma unidade manualmente pra esse item
    if (!unidadeTocada) setUnidade(sugerirUnidade(v));
  }

  function adicionar() {
    const limpo = texto.trim();
    if (!limpo) return;
    const qtd = parseFloat(quantidade.replace(",", ".")) || 1;
    dispatch({ type: "addItem", itemId: uid(), listaId: lista.id, texto: limpo, quantidade: qtd, unidade });
    setTexto("");
    setQuantidade("1");
    setUnidade("un");
    setUnidadeTocada(false);
  }

  function excluirListinha() {
    dispatch({ type: "removerLista", listaId: lista.id });
    onExcluida();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: fontSerif, fontSize: 22, fontWeight: 600, color: T.ink }}>{formatarData(lista.criadaEm)}</div>
          <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2 }}>lista de compras</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div
            onClick={() => setConfirmandoExclusao(true)}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: T.raised,
              border: `1px solid ${T.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 14,
              color: T.brick,
            }}
          >
            🗑️
          </div>
          <div
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: T.raised,
              border: `1px solid ${T.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </div>
        </div>
      </div>

      {confirmandoExclusao && (
        <Card style={{ background: T.brickSoft, border: `1px solid ${T.brick}` }}>
          <div style={{ fontSize: 12.5, color: T.ink, marginBottom: 10 }}>
            Excluir essa listinha inteira, com todos os {itens.length} itens? Não dá pra desfazer.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="ghost" onClick={() => setConfirmandoExclusao(false)}>
              Cancelar
            </Btn>
            <Btn
              onClick={excluirListinha}
              style={{ background: T.brick, color: "#fff" }}
            >
              Excluir
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={texto}
            onChange={(e) => aoMudarTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="ex: arroz 5kg, sabonete dove…"
            style={{
              flex: 1,
              border: `1px solid ${T.line}`,
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13.5,
              background: T.paper,
              color: T.ink,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            inputMode="decimal"
            aria-label="quantidade"
            style={{
              width: 64,
              border: `1px solid ${T.line}`,
              borderRadius: 10,
              padding: "10px 8px",
              fontSize: 13.5,
              background: T.paper,
              color: T.ink,
              textAlign: "center",
            }}
          />
          <select
            value={unidade}
            onChange={(e) => {
              setUnidade(e.target.value as Unidade);
              setUnidadeTocada(true);
            }}
            aria-label="unidade"
            style={{
              flex: 1,
              border: `1px solid ${T.line}`,
              borderRadius: 10,
              padding: "10px 8px",
              fontSize: 13.5,
              background: T.paper,
              color: T.ink,
            }}
          >
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.rotulo}
              </option>
            ))}
          </select>
          <button
            onClick={adicionar}
            style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, width: 44, fontSize: 18, fontWeight: 700, cursor: "pointer" }}
          >
            +
          </button>
        </div>
      </Card>

      {itens.length === 0 && (
        <div style={{ textAlign: "center", color: T.inkSoft, fontSize: 12.5, padding: "30px 10px" }}>
          Nenhum item ainda. Vá adicionando conforme algo for acabando em casa.
        </div>
      )}

      {itens.map((item) => (
        <Card key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 13.5, color: T.ink }}>{item.texto}</div>
            <div style={{ fontSize: 10.5, color: T.inkSoft, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>
              {item.quantidade} {rotuloUnidade(item.unidade)}
            </div>
          </div>
          <div onClick={() => dispatch({ type: "removerItem", itemId: item.id })} style={{ cursor: "pointer", color: T.brick, fontSize: 15, padding: "0 4px" }}>
            ✕
          </div>
        </Card>
      ))}

      {itens.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <Btn v="green" onClick={onCotar} disabled={cotando}>
            {cotando ? "Cotando…" : `Cotar (${itens.length} ${itens.length === 1 ? "item" : "itens"})`}
          </Btn>
        </div>
      )}
    </div>
  );
}
