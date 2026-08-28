"use client";

import { T } from "@/lib/theme";
import { Card, Topo } from "./ui";

export function Aristides({ nome, onClose }: { nome: string; onClose: () => void }) {
  return (
    <div>
      <Topo titulo={nome} sub="seu consultor" onClose={onClose} />
      <Card>
        <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6 }}>
          {nome} ainda está sendo preparado (comando de voz e consultor financeiro — fase 6 do projeto). Por
          enquanto, anote os gastos direto pelo Calendário.
        </div>
      </Card>
    </div>
  );
}
