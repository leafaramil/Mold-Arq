"use client";

import { useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { fmt, parseValorBR, uid } from "@/lib/format";
import { faturaDoCartao, mesVizinho, saldoCaixinha, saldoPote } from "@/lib/calc";
import type { Action } from "@/lib/action-types";
import type { DataModel } from "@/lib/types";
import { Btn, Card, Tit, Topo } from "./ui";

export function Ajustes({
  model,
  mes,
  nome,
  dispatch,
  mostrarToast,
  onSair,
  onClose,
  escutaCuringa,
  onAlternarEscutaCuringa,
}: {
  model: DataModel;
  mes: string;
  nome: string;
  dispatch: (a: Action) => void;
  mostrarToast: (msg: string) => void;
  onSair: () => void;
  onClose: () => void;
  escutaCuringa: boolean;
  onAlternarEscutaCuringa: (v: boolean) => void;
}) {
  const [np, setNp] = useState({ desc: "", parcela: "", atual: "1", total: "12", diaCompra: "" });
  const [addCartao, setAddCartao] = useState<string | null>(null);
  const [zul, setZul] = useState({ tag: "", zona: "" });
  const [retirada, setRetirada] = useState<{ pote: "emergencia" | "folga"; desc: string; valor: string } | null>(null);

  const mesAnterior = mesVizinho(mes, -1);
  const consumoMes = model.config.consumoIAMes[mes] || 0;
  const consumoMesAnterior = model.config.consumoIAMes[mesAnterior] || 0;

  return (
    <div>
      <Topo titulo="Ajustes" onClose={onClose} />

      <Card>
        <Tit>Reserva automática</Tit>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="text"
            inputMode="decimal"
            defaultValue={model.config.reservaPct}
            onBlur={(e) => dispatch({ type: "updateConfig", campo: "reservaPct", valor: parseValorBR(e.target.value) })}
            style={{ width: 78, padding: 9, borderRadius: 9, border: `1px solid ${T.line}`, fontSize: 15 }}
          />
          <span style={{ fontSize: 12.5, color: T.inkSoft }}>% · ative por receita</span>
        </div>
      </Card>

      <Card>
        <Tit>Saldo inicial</Tit>
        <input
          type="text"
          inputMode="decimal"
          defaultValue={model.config.saldoInicial}
          onBlur={(e) => dispatch({ type: "updateConfig", campo: "saldoInicial", valor: parseValorBR(e.target.value) })}
          style={{ width: "100%", padding: 10, borderRadius: 9, border: `1px solid ${T.line}`, fontSize: 17, fontFamily: fontSerif }}
        />
        <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 6 }}>Só vale enquanto não houver histórico do mês anterior.</div>
      </Card>

      <Card>
        <Tit>Saldo inicial do ZUL</Tit>
        <div style={{ fontSize: 10.5, color: T.inkSoft, marginBottom: 8 }}>
          Se já tem dinheiro guardado nessas caixinhas fora do app, informe o valor real uma única vez.
        </div>
        {(["tag", "zona"] as const).map((chave) => (
          <div key={chave} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: T.ink, flex: 1 }}>
              {model.caixinhas[chave]?.icone} {model.caixinhas[chave]?.nome} · atual {fmt(saldoCaixinha(model.caixinhas[chave]?.mov ?? []))}
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={zul[chave]}
              onChange={(e) => setZul({ ...zul, [chave]: e.target.value })}
              style={{ width: 90, padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, fontSize: 12 }}
            />
            <div
              onClick={() => {
                const saldo = parseValorBR(zul[chave]);
                if (saldo <= 0) return;
                dispatch({ type: "definirSaldoInicialZul", chave, movId: uid(), saldo, mes });
                setZul({ ...zul, [chave]: "" });
                mostrarToast("Saldo inicial definido");
              }}
              style={{ fontSize: 10.5, fontWeight: 700, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: T.goldSoft, color: "#7A5A20" }}
            >
              Definir
            </div>
          </div>
        ))}
      </Card>

      {model.cartoes.map((ct) => (
        <Card key={ct.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Tit>
              {ct.nome} · {mes}
            </Tit>
            <b style={{ fontFamily: fontSerif, fontSize: 18, color: T.ink }}>{fmt(faturaDoCartao(model.parcelas, ct.id, mes))}</b>
          </div>
          <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9.5, color: T.inkSoft, fontWeight: 700, marginBottom: 3 }}>FECHA DIA</div>
              {ct.fechaUltimoUtil ? (
                <div style={{ padding: 8, fontSize: 11.5, color: T.inkSoft }}>último dia útil</div>
              ) : (
                <input
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={ct.fechamento ?? ""}
                  placeholder="—"
                  onBlur={(e) => dispatch({ type: "updateCartao", cartaoId: ct.id, campo: "fechamento", valor: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, fontSize: 13 }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9.5, color: T.inkSoft, fontWeight: 700, marginBottom: 3 }}>VENCE DIA</div>
              <input
                type="number"
                min={1}
                max={31}
                defaultValue={ct.vencimento ?? ""}
                placeholder="—"
                onBlur={(e) => dispatch({ type: "updateCartao", cartaoId: ct.id, campo: "vencimento", valor: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, fontSize: 13 }}
              />
            </div>
          </div>

          {model.parcelas
            .filter((p) => p.cartaoId === ct.id)
            .map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.line}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{p.desc}</div>
                  <div style={{ fontSize: 9.5, color: T.inkSoft }}>
                    {p.total >= 9999 ? "recorrente" : `${p.atual}/${p.total}`} · {fmt(p.parcela)}
                  </div>
                </div>
                <div
                  onClick={() => dispatch({ type: "delParcela", parcelaId: p.id })}
                  style={{ width: 24, height: 24, borderRadius: 7, background: T.paper, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, cursor: "pointer" }}
                >
                  🗑
                </div>
              </div>
            ))}
          {model.parcelas.filter((p) => p.cartaoId === ct.id).length === 0 && <div style={{ fontSize: 11, color: T.inkSoft, padding: "8px 0" }}>Nenhum lançamento neste cartão</div>}

          {addCartao !== ct.id ? (
            <Btn v="ghost" onClick={() => setAddCartao(ct.id)} style={{ marginTop: 10, padding: 10, fontSize: 12 }}>
              + Novo lançamento
            </Btn>
          ) : (
            <div style={{ marginTop: 10 }}>
              <input
                placeholder="Descrição"
                value={np.desc}
                onChange={(e) => setNp({ ...np, desc: e.target.value })}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, marginBottom: 6, fontSize: 12 }}
              />
              <input
                placeholder="Valor da parcela"
                type="text"
                inputMode="decimal"
                value={np.parcela}
                onChange={(e) => setNp({ ...np, parcela: e.target.value })}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, marginBottom: 6, fontSize: 12 }}
              />
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input
                  placeholder="Atual"
                  type="number"
                  value={np.atual}
                  onChange={(e) => setNp({ ...np, atual: e.target.value })}
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, fontSize: 12 }}
                />
                <input
                  placeholder="Total"
                  type="number"
                  value={np.total}
                  onChange={(e) => setNp({ ...np, total: e.target.value })}
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, fontSize: 12 }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                <input
                  placeholder="Dia da compra"
                  type="number"
                  min={1}
                  max={31}
                  value={np.diaCompra}
                  onChange={(e) => setNp({ ...np, diaCompra: e.target.value })}
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, fontSize: 12 }}
                />
                <span style={{ fontSize: 9.5, color: T.inkSoft, flex: 1 }}>
                  {np.diaCompra && ct.fechamento && !ct.fechaUltimoUtil
                    ? parseInt(np.diaCompra, 10) <= ct.fechamento
                      ? "1ª parcela neste mês"
                      : "1ª parcela no mês seguinte"
                    : ct.fechaUltimoUtil
                      ? "1ª parcela sempre neste mês"
                      : "informe para calcular"}
                </span>
              </div>
              <Btn
                v="gold"
                onClick={() => {
                  if (!np.desc) return;
                  const diaCompra = parseInt(np.diaCompra, 10) || 1;
                  const base =
                    ct.fechaUltimoUtil || !ct.fechamento || diaCompra <= ct.fechamento ? mes : mesVizinho(mes, 1);
                  dispatch({
                    type: "addParcela",
                    parcelaId: uid(),
                    desc: np.desc,
                    parcela: parseValorBR(np.parcela),
                    atual: parseInt(np.atual, 10) || 1,
                    total: parseInt(np.total, 10) || 1,
                    cartaoId: ct.id,
                    base,
                  });
                  setNp({ desc: "", parcela: "", atual: "1", total: "12", diaCompra: "" });
                  setAddCartao(null);
                }}
                style={{ padding: 10, fontSize: 12, marginBottom: 6 }}
              >
                Adicionar
              </Btn>
              <Btn v="ghost" onClick={() => setAddCartao(null)} style={{ padding: 10, fontSize: 12 }}>
                Cancelar
              </Btn>
            </div>
          )}
        </Card>
      ))}

      <Card>
        <Tit>Poupança</Tit>
        {(
          [
            ["emergencia", "Emergência", model.potes.emergenciaHist] as const,
            ["folga", "Folga do mês", model.potes.folgaHist] as const,
          ]
        ).map(([chave, label, hist]) => (
          <div key={chave} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 12.5, color: T.ink }}>{label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b style={{ fontFamily: fontSerif, fontSize: 14, color: T.sage }}>{fmt(saldoPote(hist))}</b>
              <div
                onClick={() => setRetirada({ pote: chave, desc: "", valor: "" })}
                style={{ fontSize: 9.5, fontWeight: 700, padding: "5px 8px", borderRadius: 7, cursor: "pointer", background: T.paper, border: `1px solid ${T.line}`, color: T.inkSoft }}
              >
                Retirar
              </div>
            </div>
          </div>
        ))}
        {retirada && (
          <div style={{ marginTop: 10 }}>
            <input
              placeholder="Motivo da retirada"
              value={retirada.desc}
              onChange={(e) => setRetirada({ ...retirada, desc: e.target.value })}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, marginBottom: 6, fontSize: 12 }}
            />
            <input
              placeholder="Valor"
              type="text"
              inputMode="decimal"
              value={retirada.valor}
              onChange={(e) => setRetirada({ ...retirada, valor: e.target.value })}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${T.line}`, marginBottom: 8, fontSize: 12 }}
            />
            <Btn
              v="gold"
              onClick={() => {
                const valor = parseValorBR(retirada.valor);
                if (valor <= 0 || !retirada.desc) return;
                dispatch({ type: "retirarPote", pote: retirada.pote, histId: uid(), desc: retirada.desc, valor: -valor });
                setRetirada(null);
                mostrarToast("Retirada registrada");
              }}
              style={{ padding: 10, fontSize: 12, marginBottom: 6 }}
            >
              Confirmar retirada
            </Btn>
            <Btn v="ghost" onClick={() => setRetirada(null)} style={{ padding: 10, fontSize: 12 }}>
              Cancelar
            </Btn>
          </div>
        )}
      </Card>

      <Card>
        <Tit>Assistente</Tit>
        <input
          defaultValue={model.config.assistente}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v.length > 0 && v.length < 5) {
              mostrarToast("Nome curto pode disparar sozinho durante uma conversa");
            }
            if (v) dispatch({ type: "updateConfig", campo: "assistente", valor: v });
          }}
          style={{ width: "100%", padding: 10, borderRadius: 9, border: `1px solid ${T.line}`, fontSize: 14, fontFamily: "inherit", marginBottom: 8 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.ink }}>Responder falando</span>
          <div
            onClick={() => dispatch({ type: "updateConfig", campo: "vozAtiva", valor: !model.config.vozAtiva })}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              background: model.config.vozAtiva ? T.sageSoft : T.paper,
              border: `1px solid ${T.line}`,
              color: model.config.vozAtiva ? T.sage : T.inkSoft,
            }}
          >
            {model.config.vozAtiva ? "ligado" : "desligado"}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 12, color: T.ink }}>Escuta contínua (chama pelo nome em qualquer tela)</span>
          <div
            onClick={() => onAlternarEscutaCuringa(!escutaCuringa)}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              background: escutaCuringa ? T.sageSoft : T.paper,
              border: `1px solid ${T.line}`,
              color: escutaCuringa ? T.sage : T.inkSoft,
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {escutaCuringa ? "ligado" : "desligado"}
          </div>
        </div>
        <div style={{ fontSize: 10, color: T.inkSoft, marginTop: 6, lineHeight: 1.4 }}>
          Com o Caderno aberto (em qualquer tela), fala o nome de {model.config.assistente} que ele já responde — sem precisar tocar em nada. Só funciona com o app na tela, não com ela apagada.
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.inkSoft, padding: "2px 0" }}>
            <span>consumo este mês</span>
            <b style={{ color: T.ink }}>{fmt(consumoMes)}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.inkSoft, padding: "2px 0" }}>
            <span>previsão p/ o mês que vem</span>
            <b style={{ color: T.ink }}>{fmt(Math.max(consumoMes, consumoMesAnterior))}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.inkSoft, padding: "2px 0" }}>
            <span>total acumulado</span>
            <b style={{ color: T.ink }}>{fmt(model.config.consumoIA)}</b>
          </div>
        </div>
      </Card>

      <Card>
        <Btn
          v="ghost"
          onClick={async () => {
            const resp = await fetch("/api/export");
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `caderno-backup-${mes}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{ marginBottom: 0 }}
        >
          ⬇ Baixar backup completo (JSON)
        </Btn>
      </Card>

      <Card style={{ padding: "3px 15px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12.5 }}>
          <span style={{ color: T.ink, fontWeight: 600 }}>Usuário</span>
          <span style={{ color: T.inkSoft }}>{nome}</span>
        </div>
        <div onClick={onSair} style={{ padding: "11px 0", fontSize: 12.5, color: T.brick, fontWeight: 700, cursor: "pointer" }}>
          Sair do app
        </div>
      </Card>
    </div>
  );
}
