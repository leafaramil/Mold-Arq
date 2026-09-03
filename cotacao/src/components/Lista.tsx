"use client";

import { useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { formatarData, uid } from "@/lib/format";
import type { Action } from "@/lib/action-types";
import type { Item, Lista as ListaType, ResultadoCotacao } from "@/lib/types";
import { Btn, Card } from "./ui";

export function Lista({
  lista,
  itens,
  cotando,
  cotacaoSalva,
  dispatch,
  onCotar,
  onVerCotacao,
  onExcluida,
  onClose,
}: {
  lista: ListaType;
  itens: Item[];
  cotando: boolean;
  cotacaoSalva: ResultadoCotacao | null;
  dispatch: (action: Action) => void;
  onCotar: () => void;
  onVerCotacao: () => void;
  onExcluida: () => void;
  onClose: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  function adicionar() {
    const limpo = texto.trim();
    if (!limpo) return;
    dispatch({ type: "addItem", itemId: uid(), listaId: lista.id, texto: limpo });
    setTexto("");
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
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="ex: arroz, sabonete dove…"
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
          <button
            onClick={adicionar}
            style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, width: 44, fontSize: 18, fontWeight: 700, cursor: "pointer" }}
          >
            +
          </button>
        </div>
        <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 6 }}>
          Sem quantidade aqui — a cotação mostra o preço de 1 unidade de cada item em cada mercado, e você define quanto quer comprar depois de ver o resultado.
        </div>
      </Card>

      {itens.length === 0 && (
        <div style={{ textAlign: "center", color: T.inkSoft, fontSize: 12.5, padding: "30px 10px" }}>
          Nenhum item ainda. Vá adicionando conforme algo for acabando em casa.
        </div>
      )}

      {itens.map((item) => (
        <Card key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 15px" }}>
          <div style={{ fontSize: 13.5, color: T.ink }}>{item.texto}</div>
          <div onClick={() => dispatch({ type: "removerItem", itemId: item.id })} style={{ cursor: "pointer", color: T.brick, fontSize: 15, padding: "0 4px" }}>
            ✕
          </div>
        </Card>
      ))}

      {cotacaoSalva && (
        <Card onClick={onVerCotacao} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>Última cotação</div>
            <div style={{ fontSize: 11, color: T.inkSoft }}>{new Date(cotacaoSalva.geradoEm).toLocaleString("pt-BR")}</div>
          </div>
          <div style={{ color: T.gold, fontSize: 13 }}>ver →</div>
        </Card>
      )}

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
