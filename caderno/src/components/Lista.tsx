"use client";

import { useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { fmt, uid } from "@/lib/format";
import { mediaRealDe, nomeMes, resolverDespesa, resolverReceita } from "@/lib/calc";
import type { Action } from "@/lib/action-types";
import type { DataModel, Quinzena, ResolvedDespesa, ResolvedReceita } from "@/lib/types";
import { Btn, Card, NavMes, Tit, Topo } from "./ui";
import { ModalEscopo } from "./modals";

type ModalState = { titulo: string; onOk: (soNesseMes: boolean) => void };

type ItemDespesa = ResolvedDespesa;
type ItemReceita = ResolvedReceita;

export function ListaDespesas({
  model,
  mes,
  setMes,
  dispatch,
  mostrarToast,
  onClose,
}: {
  model: DataModel;
  mes: string;
  setMes: (m: string) => void;
  dispatch: (a: Action) => void;
  mostrarToast: (msg: string) => void;
  onClose: () => void;
}) {
  const itens = model.despesas.map((d) => resolverDespesa(d, mes)).filter((d): d is ItemDespesa => d !== null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [open, setOpen] = useState(false);
  const [n, setN] = useState({ nome: "", valor: "", dia: "", q: "Q1" as Quinzena, parcelado: false, parcelaAtual: "1", parcelaTotal: "" });

  function editar(id: string, v: string) {
    const valor = parseFloat(v.replace(",", ".")) || 0;
    setModal({
      titulo: "Aplicar em qual período?",
      onOk: (soNesseMes) => {
        dispatch({ type: "editarValor", tipo: "despesa", itemId: id, mes, valor, soNesseMes });
        setModal(null);
        mostrarToast(soNesseMes ? `Ajustado em ${mes}` : "Ajustado em todos os meses");
      },
    });
  }

  function remover(id: string) {
    setModal({
      titulo: "Remover de qual período?",
      onOk: (soNesseMes) => {
        dispatch({ type: "removerItem", tipo: "despesa", itemId: id, mes, soNesseMes });
        setModal(null);
        mostrarToast(soNesseMes ? `Removido de ${mes}` : "Removido de todos");
      },
    });
  }

  function linha(i: ItemDespesa) {
    const media = mediaRealDe(i.id, i.overrides, model.estados, mes);
    return (
      <div key={i.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 7 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>
              {i.icone} {i.nome}
            </div>
            <div style={{ fontSize: 9.5, color: T.inkSoft }}>
              {i.parcelaInfo ? `parcela ${i.parcelaInfo.atual}/${i.parcelaInfo.total}` : i.dia ? `dia ${i.dia}` : "sem data"}
              {i.apenasMes ? " · só neste mês" : ""}
              {!i.parcelaInfo && media ? ` · média ${fmt(media.media)}` : ""}
            </div>
          </div>
          <EditavelValor valor={i.valor} onEditar={(v) => editar(i.id, v)} />
          <div
            onClick={() => remover(i.id)}
            style={{ width: 25, height: 25, borderRadius: 7, background: T.paper, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, cursor: "pointer" }}
          >
            🗑
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topo titulo="Despesas" sub="Toque no valor para editar" onClose={onClose} />
      <NavMes mes={mes} setMes={setMes} />
      <Tit>1ª quinzena · vence até dia 15</Tit>
      <Card style={{ padding: "3px 15px" }}>{itens.filter((i) => i.q === "Q1").map(linha)}</Card>
      <Tit>2ª quinzena · vence do dia 16 em diante</Tit>
      <Card style={{ padding: "3px 15px" }}>{itens.filter((i) => i.q === "Q2").map(linha)}</Card>

      {!open ? (
        <Btn v="ghost" onClick={() => setOpen(true)}>
          + Adicionar
        </Btn>
      ) : (
        <Card>
          <input
            placeholder="Nome"
            value={n.nome}
            onChange={(e) => setN({ ...n, nome: e.target.value })}
            style={{ width: "100%", padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, marginBottom: 7, fontSize: 13, fontFamily: "inherit" }}
          />
          <input
            placeholder={n.parcelado ? "Valor de cada parcela" : "Valor"}
            type="number"
            value={n.valor}
            onChange={(e) => setN({ ...n, valor: e.target.value })}
            style={{ width: "100%", padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, marginBottom: 7, fontSize: 13, fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 7, marginBottom: 9 }}>
            <input
              placeholder="Dia (opcional)"
              type="number"
              min={1}
              max={31}
              value={n.dia}
              onChange={(e) => setN({ ...n, dia: e.target.value })}
              style={{ flex: 1, padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, fontSize: 12, fontFamily: "inherit" }}
            />
            {!n.parcelado && (
              <select
                value={n.q}
                onChange={(e) => setN({ ...n, q: e.target.value as Quinzena })}
                style={{ flex: 1, padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, fontSize: 12, fontFamily: "inherit" }}
              >
                <option value="Q1">1ª quinzena</option>
                <option value="Q2">2ª quinzena</option>
              </select>
            )}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.ink, marginBottom: 9, cursor: "pointer" }}>
            <input type="checkbox" checked={n.parcelado} onChange={(e) => setN({ ...n, parcelado: e.target.checked })} />
            É parcelado (financiamento, boleto em várias vezes — não é fatura de cartão)
          </label>

          {n.parcelado && (
            <div style={{ display: "flex", gap: 7, marginBottom: 9 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9.5, color: T.inkSoft, fontWeight: 700, marginBottom: 3 }}>QUANTAS PARCELAS AO TODO</div>
                <input
                  type="number"
                  min={1}
                  value={n.parcelaTotal}
                  onChange={(e) => setN({ ...n, parcelaTotal: e.target.value })}
                  style={{ width: "100%", padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, fontSize: 12, fontFamily: "inherit" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9.5, color: T.inkSoft, fontWeight: 700, marginBottom: 3 }}>ESSA É A Nº</div>
                <input
                  type="number"
                  min={1}
                  value={n.parcelaAtual}
                  onChange={(e) => setN({ ...n, parcelaAtual: e.target.value })}
                  style={{ width: "100%", padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, fontSize: 12, fontFamily: "inherit" }}
                />
              </div>
            </div>
          )}
          {n.parcelado && (
            <div style={{ fontSize: 10, color: T.inkSoft, marginBottom: 9 }}>
              Vai aparecer como {n.parcelaAtual || "1"}/{n.parcelaTotal || "N"} em {nomeMes(mes)}, e ir subindo mês a mês até acabar.
            </div>
          )}

          <Btn
            v="gold"
            onClick={() => {
              if (!n.nome) return;
              const dia = n.dia ? parseInt(n.dia, 10) : null;
              const valor = parseFloat(n.valor) || 0;
              const parcelamento =
                n.parcelado && n.parcelaTotal
                  ? { valor, atual: parseInt(n.parcelaAtual, 10) || 1, total: parseInt(n.parcelaTotal, 10), base: mes }
                  : undefined;
              dispatch({
                type: "addDespesa",
                itemId: uid(),
                mes,
                apenasEsseMes: false,
                dados: { nome: n.nome, icone: "📌", valor, dia, parcelamento },
              });
              setN({ nome: "", valor: "", dia: "", q: "Q1", parcelado: false, parcelaAtual: "1", parcelaTotal: "" });
              setOpen(false);
            }}
            style={{ marginBottom: 7 }}
          >
            Adicionar
          </Btn>
          <Btn v="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Btn>
        </Card>
      )}

      {modal && <ModalEscopo mes={mes} titulo={modal.titulo} onOk={modal.onOk} onNo={() => setModal(null)} />}
    </div>
  );
}

export function ListaReceitas({
  model,
  mes,
  setMes,
  dispatch,
  mostrarToast,
  onClose,
}: {
  model: DataModel;
  mes: string;
  setMes: (m: string) => void;
  dispatch: (a: Action) => void;
  mostrarToast: (msg: string) => void;
  onClose: () => void;
}) {
  const itens = model.receitas.map((r) => resolverReceita(r, mes)).filter((r): r is ItemReceita => r !== null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [open, setOpen] = useState(false);
  const [n, setN] = useState({ nome: "", valor: "", dia: "", q: "Q1" as Quinzena });

  function editar(id: string, v: string) {
    const valor = parseFloat(v.replace(",", ".")) || 0;
    setModal({
      titulo: "Aplicar em qual período?",
      onOk: (soNesseMes) => {
        dispatch({ type: "editarValor", tipo: "receita", itemId: id, mes, valor, soNesseMes });
        setModal(null);
        mostrarToast(soNesseMes ? `Ajustado em ${mes}` : "Ajustado em todos os meses");
      },
    });
  }

  function remover(id: string) {
    setModal({
      titulo: "Remover de qual período?",
      onOk: (soNesseMes) => {
        dispatch({ type: "removerItem", tipo: "receita", itemId: id, mes, soNesseMes });
        setModal(null);
        mostrarToast(soNesseMes ? `Removido de ${mes}` : "Removido de todos");
      },
    });
  }

  function linha(i: ItemReceita) {
    return (
      <div key={i.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 7 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: i.ativa ? T.ink : T.inkSoft }}>
              {i.icone} {i.nome}
            </div>
            <div style={{ fontSize: 9.5, color: T.inkSoft }}>
              {i.quando || (i.dia ? `dia ${i.dia}` : "sem data")}
              {i.apenasMes ? " · só neste mês" : ""}
              {!i.ativa ? " · pausada" : ""}
            </div>
          </div>
          <EditavelValor valor={i.valor} onEditar={(v) => editar(i.id, v)} />
          <div
            onClick={() => remover(i.id)}
            style={{ width: 25, height: 25, borderRadius: 7, background: T.paper, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, cursor: "pointer" }}
          >
            🗑
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
          <div
            onClick={() => dispatch({ type: "toggleReceita", receitaId: i.id, campo: "ativa" })}
            style={{ fontSize: 10, fontWeight: 700, padding: "5px 9px", borderRadius: 8, cursor: "pointer", background: i.ativa ? T.sageSoft : T.goldSoft, color: i.ativa ? T.sage : "#7A5A20" }}
          >
            {i.ativa ? "ativa · pausar" : i.id === "aluguel" ? "aluguei — ativar" : "ativar"}
          </div>
          <div
            onClick={() => dispatch({ type: "toggleReceita", receitaId: i.id, campo: "reserva" })}
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "5px 9px",
              borderRadius: 8,
              cursor: "pointer",
              background: i.reserva ? T.sageSoft : T.paper,
              border: `1px solid ${T.line}`,
              color: i.reserva ? T.sage : T.inkSoft,
            }}
          >
            reserva {model.config.reservaPct}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topo titulo="Receitas" sub="Toque no valor para editar" onClose={onClose} />
      <NavMes mes={mes} setMes={setMes} />
      <Tit>1ª quinzena · vence até dia 15</Tit>
      <Card style={{ padding: "3px 15px" }}>{itens.filter((i) => i.q === "Q1").map(linha)}</Card>
      <Tit>2ª quinzena · vence do dia 16 em diante</Tit>
      <Card style={{ padding: "3px 15px" }}>{itens.filter((i) => i.q === "Q2").map(linha)}</Card>

      {!open ? (
        <Btn v="ghost" onClick={() => setOpen(true)}>
          + Adicionar
        </Btn>
      ) : (
        <Card>
          <input
            placeholder="Nome"
            value={n.nome}
            onChange={(e) => setN({ ...n, nome: e.target.value })}
            style={{ width: "100%", padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, marginBottom: 7, fontSize: 13, fontFamily: "inherit" }}
          />
          <input
            placeholder="Valor"
            type="number"
            value={n.valor}
            onChange={(e) => setN({ ...n, valor: e.target.value })}
            style={{ width: "100%", padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, marginBottom: 7, fontSize: 13, fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 7, marginBottom: 9 }}>
            <input
              placeholder="Dia (opcional)"
              type="number"
              min={1}
              max={31}
              value={n.dia}
              onChange={(e) => setN({ ...n, dia: e.target.value })}
              style={{ flex: 1, padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, fontSize: 12, fontFamily: "inherit" }}
            />
            <select
              value={n.q}
              onChange={(e) => setN({ ...n, q: e.target.value as Quinzena })}
              style={{ flex: 1, padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, fontSize: 12, fontFamily: "inherit" }}
            >
              <option value="Q1">1ª quinzena</option>
              <option value="Q2">2ª quinzena</option>
            </select>
          </div>
          <Btn
            v="gold"
            onClick={() => {
              if (!n.nome) return;
              const dia = n.dia ? parseInt(n.dia, 10) : null;
              dispatch({
                type: "addReceita",
                itemId: uid(),
                mes,
                apenasEsseMes: false,
                dados: { nome: n.nome, icone: "💰", valor: parseFloat(n.valor) || 0, dia, quando: dia ? `dia ${dia}` : "sem data", q: n.q },
              });
              setN({ nome: "", valor: "", dia: "", q: "Q1" });
              setOpen(false);
            }}
            style={{ marginBottom: 7 }}
          >
            Adicionar
          </Btn>
          <Btn v="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Btn>
        </Card>
      )}

      {modal && <ModalEscopo mes={mes} titulo={modal.titulo} onOk={modal.onOk} onNo={() => setModal(null)} />}
    </div>
  );
}

function EditavelValor({ valor, onEditar }: { valor: number; onEditar: (v: string) => void }) {
  const [ed, setEd] = useState(false);
  const [v, setV] = useState(String(valor));
  return ed ? (
    <input
      type="number"
      autoFocus
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        onEditar(v);
        setEd(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onEditar(v);
          setEd(false);
        }
      }}
      style={{ width: 78, padding: 6, borderRadius: 8, border: `1px solid ${T.gold}`, fontSize: 12, textAlign: "right" }}
    />
  ) : (
    <b
      onClick={() => {
        setV(String(valor));
        setEd(true);
      }}
      style={{ fontFamily: fontSerif, fontSize: 12.5, color: T.ink, cursor: "pointer", whiteSpace: "nowrap" }}
    >
      {fmt(valor)} <span style={{ fontSize: 9, color: T.gold }}>✎</span>
    </b>
  );
}
