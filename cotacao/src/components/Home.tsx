"use client";

import { T, fontSerif } from "@/lib/theme";
import { formatarData } from "@/lib/format";
import type { Item, Lista } from "@/lib/types";
import { Btn, Card } from "./ui";

export function Home({
  nome,
  listas,
  itens,
  onNovaLista,
  onAbrirLista,
  onAjustes,
}: {
  nome: string;
  listas: Lista[];
  itens: Item[];
  onNovaLista: () => void;
  onAbrirLista: (listaId: string) => void;
  onAjustes: () => void;
}) {
  const listasOrdenadas = [...listas].sort((a, b) => (a.criadaEm < b.criadaEm ? 1 : -1));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: fontSerif, fontSize: 24, fontWeight: 600, color: T.ink }}>Cotação</div>
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

      <div style={{ marginBottom: 16 }}>
        <Btn v="green" onClick={onNovaLista}>
          + Nova listinha
        </Btn>
      </div>

      {listasOrdenadas.length === 0 && (
        <div style={{ textAlign: "center", color: T.inkSoft, fontSize: 12.5, padding: "30px 10px" }}>
          Nenhuma listinha ainda. Toque em "Nova listinha" pra começar a anotar o que está faltando em casa.
        </div>
      )}

      {listasOrdenadas.map((lista) => {
        const qtd = itens.filter((i) => i.listaId === lista.id).length;
        return (
          <Card
            key={lista.id}
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "13px 15px" }}
          >
            <div
              onClick={() => onAbrirLista(lista.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}
            >
              <div style={{ fontSize: 24 }}>🛒</div>
              <div>
                <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>{formatarData(lista.criadaEm)}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>
                  {qtd} {qtd === 1 ? "item" : "itens"}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
