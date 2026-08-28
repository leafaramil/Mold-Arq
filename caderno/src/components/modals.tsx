"use client";

import { useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { fmt } from "@/lib/format";
import type { FaixaZul } from "@/lib/calc";
import { Btn } from "./ui";

const overlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(44,58,54,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 600,
  padding: 24,
};

const boxStyle = { background: T.paper, borderRadius: 20, padding: 22, width: "100%", maxWidth: 330 };

export function ModalEscopo({ mes, titulo, onOk, onNo }: { mes: string; titulo: string; onOk: (soNesseMes: boolean) => void; onNo: () => void }) {
  return (
    <div style={overlayStyle}>
      <div style={boxStyle}>
        <div style={{ fontFamily: fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 16 }}>{titulo}</div>
        <Btn v="gold" onClick={() => onOk(true)} style={{ marginBottom: 9 }}>
          Só em {mes}
        </Btn>
        <Btn onClick={() => onOk(false)} style={{ marginBottom: 9 }}>
          Em todos os meses
        </Btn>
        <Btn v="ghost" onClick={onNo}>
          Cancelar
        </Btn>
      </div>
    </div>
  );
}

export interface ModalValorProps {
  titulo: string;
  sub?: string;
  valorInicial?: number | string;
  onOk: (valor: string) => void;
  onNo: () => void;
}

export function ModalValor({ titulo, sub, valorInicial, onOk, onNo }: ModalValorProps) {
  const [v, setV] = useState(String(valorInicial ?? ""));
  return (
    <div style={overlayStyle}>
      <div style={boxStyle}>
        <div style={{ fontFamily: fontSerif, fontSize: 17, fontWeight: 600, color: T.ink }}>{titulo}</div>
        {sub && <div style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 14 }}>{sub}</div>}
        <input
          type="number"
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: `1.5px solid ${T.gold}`,
            fontSize: 22,
            fontFamily: fontSerif,
            marginBottom: 14,
            textAlign: "center",
          }}
        />
        <Btn v="sage" onClick={() => onOk(v)} style={{ marginBottom: 9 }}>
          Confirmar
        </Btn>
        <Btn v="ghost" onClick={onNo}>
          Cancelar
        </Btn>
      </div>
    </div>
  );
}

export function ModalFaixas({
  titulo,
  sub,
  faixas,
  onOk,
  onNo,
}: {
  titulo: string;
  sub?: string;
  faixas: FaixaZul[];
  onOk: (faixa: FaixaZul) => void;
  onNo: () => void;
}) {
  return (
    <div style={overlayStyle}>
      <div style={{ ...boxStyle, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ fontFamily: fontSerif, fontSize: 17, fontWeight: 600, color: T.ink }}>{titulo}</div>
        {sub && <div style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 14 }}>{sub}</div>}
        {faixas.map((f) => (
          <div
            key={f.disponivel}
            onClick={() => onOk(f)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 14px",
              borderRadius: 12,
              background: T.raised,
              border: `1px solid ${T.line}`,
              marginBottom: 7,
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{fmt(f.disponivel)} disponíveis</div>
              {f.custo > f.disponivel && <div style={{ fontSize: 10, color: T.inkSoft }}>tarifa {fmt(f.custo - f.disponivel)}</div>}
            </div>
            <b style={{ fontFamily: fontSerif, fontSize: 14, color: T.brick }}>paga {fmt(f.custo)}</b>
          </div>
        ))}
        <Btn v="ghost" onClick={onNo} style={{ marginTop: 6 }}>
          Cancelar
        </Btn>
      </div>
    </div>
  );
}
