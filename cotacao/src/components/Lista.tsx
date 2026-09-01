"use client";

import { useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { uid } from "@/lib/format";
import type { Action } from "@/lib/action-types";
import type { Item } from "@/lib/types";
import { Btn, Card } from "./ui";

export function Lista({
  itens,
  nome,
  cotando,
  dispatch,
  onCotar,
  onAjustes,
}: {
  itens: Item[];
  nome: string;
  cotando: boolean;
  dispatch: (action: Action) => void;
  onCotar: () => void;
  onAjustes: () => void;
}) {
  const [texto, setTexto] = useState("");

  function adicionar() {
    const limpo = texto.trim();
    if (!limpo) return;
    dispatch({ type: "addItem", itemId: uid(), texto: limpo });
    setTexto("");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: fontSerif, fontSize: 24, fontWeight: 600, color: T.ink }}>Lista de compras</div>
          <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2 }}>oi, {nome}</div>
        </div>
        <div
          onClick={onAjustes}
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
            fontSize: 15,
          }}
        >
          ⚙️
        </div>
      </div>

      <Card style={{ display: "flex", gap: 8 }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
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
        <button
          onClick={adicionar}
          style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, width: 44, fontSize: 18, fontWeight: 700, cursor: "pointer" }}
        >
          +
        </button>
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
