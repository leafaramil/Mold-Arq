"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { T, fontSerif } from "@/lib/theme";
import { fmt, hojeISO, uid } from "@/lib/format";
import {
  FAIXAS_TAG,
  FAIXAS_ZONA,
  calcularAvisos,
  calcularLivre,
  dizimoDe,
  dizimoPrevisto,
  estadoDe,
  gastoTotal,
  mediaRealDe,
  previsto,
  resolverCartao,
  resolverDespesa,
  resolverReceita,
  saldoCaixinha,
  textoAviso,
  type FaixaZul,
} from "@/lib/calc";
import type { Action } from "@/lib/action-types";
import type { DataModel, EstadoItem, Quinzena, ResolvedCartao, ResolvedDespesa, ResolvedReceita } from "@/lib/types";
import { ESTADO_VAZIO } from "@/lib/types";
import { Card, NavMes, Topo, Btn } from "./ui";
import { ModalEscopo, ModalFaixas, ModalValor } from "./modals";

type ModalState =
  | { tipo: "valor"; titulo: string; sub?: string; valorInicial?: number | string; onOk: (v: string) => void }
  | { tipo: "faixas"; titulo: string; sub?: string; faixas: FaixaZul[]; onOk: (f: FaixaZul) => void }
  | { tipo: "escopo"; titulo: string; onOk: (soNesseMes: boolean) => void };

interface Btn2 {
  t: string;
  on: () => void;
  ativo?: boolean;
  azul?: boolean;
}

function Linha({
  ic,
  nome,
  meta,
  valor,
  cor,
  sinal,
  btns,
  riscado,
  editavel,
  onEditar,
  onNome,
  alerta,
}: {
  ic: string;
  nome: string;
  meta?: string;
  valor: number;
  cor: string;
  sinal: string;
  btns: Btn2[];
  riscado?: boolean;
  editavel?: boolean;
  onEditar?: (v: string) => void;
  onNome?: () => void;
  alerta?: boolean;
}) {
  const [ed, setEd] = useState(false);
  const [v, setV] = useState(String(valor));
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}` }}>
      <div onClick={onNome} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: onNome ? "pointer" : "default" }}>
        <span style={{ fontSize: 14 }}>{ic}</span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: riscado ? T.inkSoft : T.ink,
              textDecoration: riscado ? "line-through" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {nome}
            {onNome && <span style={{ color: T.blue, fontSize: 9, marginLeft: 3 }}>▾</span>}
          </div>
          {meta && <div style={{ fontSize: 9.5, color: alerta ? T.brick : T.inkSoft, fontWeight: alerta ? 700 : 400 }}>{meta}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {ed ? (
          <input
            type="number"
            autoFocus
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={() => {
              onEditar?.(v);
              setEd(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onEditar?.(v);
                setEd(false);
              }
            }}
            style={{ width: 72, padding: 5, borderRadius: 7, border: `1.5px solid ${T.gold}`, fontSize: 12, textAlign: "right" }}
          />
        ) : (
          <b
            onClick={() => {
              if (editavel) {
                setV(String(valor));
                setEd(true);
              }
            }}
            style={{ color: cor, fontFamily: fontSerif, fontSize: 12.5, whiteSpace: "nowrap", cursor: editavel ? "pointer" : "default" }}
          >
            {sinal} {fmt(valor)}
            {editavel && <span style={{ fontSize: 9, color: T.gold, marginLeft: 2 }}>✎</span>}
          </b>
        )}
        {btns.map((b, i) => (
          <div
            key={i}
            onClick={b.on}
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              padding: "5px 7px",
              borderRadius: 7,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: b.ativo ? T.sageSoft : b.azul ? T.blueSoft : T.goldSoft,
              color: b.ativo ? T.sage : b.azul ? T.blue : "#7A5A20",
            }}
          >
            {b.t}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Calendario({
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
  const [modal, setModal] = useState<ModalState | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [cxAberta, setCxAberta] = useState<string | null>(null);
  const hoje = useMemo(() => new Date(), []);

  const estadosDoMes = model.estados[mes] ?? {};
  const estadoDeId = (id: string): EstadoItem => estadosDoMes[id] ?? ESTADO_VAZIO;

  const despesas = useMemo(
    () => model.despesas.map((d) => resolverDespesa(d, mes)).filter((d): d is ResolvedDespesa => d !== null),
    [model.despesas, mes],
  );
  const receitas = useMemo(
    () =>
      model.receitas
        .map((r) => resolverReceita(r, mes))
        .filter((r): r is ResolvedReceita => r !== null)
        .filter((r) => r.ativa),
    [model.receitas, mes],
  );
  const cartoes = useMemo(
    () => model.cartoes.map((c) => resolverCartao(c, model.parcelas, mes)),
    [model.cartoes, model.parcelas, mes],
  );

  const livre = useMemo(() => calcularLivre(model, mes, hoje), [model, mes, hoje]);

  const avisos = useMemo(() => {
    const itens = [
      ...despesas.map((d) => ({ id: d.id, nome: d.nome, icone: d.icone, dia: d.dia })),
      ...cartoes.map((c) => ({ id: c.id, nome: c.nome, icone: c.icone, dia: c.vencimento })),
    ];
    const estados: Record<string, { pago: number | null }> = {};
    for (const it of itens) estados[it.id] = { pago: estadoDeId(it.id).pago };
    return calcularAvisos(itens, estados, model.avisosDispensados, mes, hoje);
  }, [despesas, cartoes, model.avisosDispensados, mes, hoje, estadosDoMes]);

  const avisoDe = (id: string) => avisos.find((a) => a.itemId === id);

  const impostoRafaelValor = despesas.find((d) => d.id === "imposto_rafael")?.valor ?? 0;
  const contadorValor = despesas.find((d) => d.id === "contador")?.valor ?? 0;

  const fechar = () => setModal(null);

  function separar(id: string, nome: string, valorSugerido: number) {
    setModal({
      tipo: "valor",
      titulo: `Separar ${nome}`,
      sub: "Quanto vai guardar?",
      valorInicial: valorSugerido,
      onOk: (v) => {
        dispatch({ type: "separar", mes, itemId: id, valor: parseFloat(v.replace(",", ".")) || 0 });
        fechar();
        mostrarToast("Separado");
      },
    });
  }

  function pagar(id: string, nome: string) {
    const e = estadoDeId(id);
    const gasto = gastoTotal(e.gastos);
    const item = despesas.find((d) => d.id === id) ?? cartoes.find((c) => c.id === id);
    const media = item && "overrides" in item ? mediaRealDe(id, item.overrides, model.estados, mes) : null;
    const sugerido = e.separado != null ? gasto || e.separado : item ? previsto(item.valor, media) : 0;
    setModal({
      tipo: "valor",
      titulo: `Pagar ${nome}`,
      sub: "Valor real",
      valorInicial: sugerido,
      onOk: (v) => {
        const val = parseFloat(v.replace(",", ".")) || 0;
        dispatch({ type: "pagar", mes, itemId: id, valor: val });
        fechar();
        if (e.separado != null) {
          const dif = e.separado - val;
          mostrarToast(dif > 0.01 ? `Sobraram ${fmt(dif)} — voltaram pro livre` : dif < -0.01 ? `Estourou ${fmt(-dif)}` : "Pago");
        } else mostrarToast("Pago");
      },
    });
  }

  function addGastoEm(id: string, nome: string) {
    const e = estadoDeId(id);
    const restante = (e.separado || 0) - gastoTotal(e.gastos);
    setModal({
      tipo: "valor",
      titulo: `Gasto em ${nome}`,
      sub: `Caixinha tem ${fmt(restante)}`,
      valorInicial: "",
      onOk: (v) => {
        const val = parseFloat(v.replace(",", ".")) || 0;
        fechar();
        if (val <= 0) return;
        dispatch({ type: "addGasto", mes, itemId: id, valor: val, data: hojeISO(new Date()), gastoId: uid() });
        mostrarToast("Gasto registrado");
      },
    });
  }

  function fecharCaixinha(id: string) {
    const e = estadoDeId(id);
    const g = gastoTotal(e.gastos);
    const dif = (e.separado || 0) - g;
    dispatch({ type: "fecharCaixinha", mes, itemId: id });
    mostrarToast(dif >= 0 ? `Sobraram ${fmt(dif)} — voltaram pro livre` : `Estourou ${fmt(-dif)}`);
  }

  function receber(r: ResolvedReceita) {
    const e = estadoDeId(r.id);
    if (e.recebido != null) {
      dispatch({ type: "desfazerRecebimento", mes, receitaId: r.id });
      mostrarToast("Desfeito");
      return;
    }
    setModal({
      tipo: "valor",
      titulo: `Confirmar ${r.nome}`,
      sub: "Quanto caiu?",
      valorInicial: r.valor,
      onOk: (v) => {
        const val = parseFloat(v.replace(",", ".")) || 0;
        dispatch({ type: "receber", mes, receitaId: r.id, valor: val, reservaPct: r.reserva ? model.config.reservaPct : null });
        fechar();
        mostrarToast("Recebimento confirmado");
      },
    });
  }

  function devolver(r: ResolvedReceita) {
    const e = estadoDeId(r.id);
    if (e.devolvido != null) {
      dispatch({ type: "desfazerDevolucao", mes, receitaId: r.id });
      mostrarToast("Desfeito");
      return;
    }
    const sugerido = dizimoDe(r, e, impostoRafaelValor, contadorValor) || dizimoPrevisto(r, impostoRafaelValor, contadorValor);
    setModal({
      tipo: "valor",
      titulo: "Devolver o dízimo",
      sub: `Sobre ${r.nome}`,
      valorInicial: sugerido,
      onOk: (v) => {
        dispatch({ type: "devolver", mes, receitaId: r.id, valor: parseFloat(v.replace(",", ".")) || 0 });
        fechar();
        mostrarToast("Devolvido");
      },
    });
  }

  function recarregarCaixinha(chave: string) {
    const isTag = chave === "tag";
    setModal({
      tipo: "faixas",
      titulo: `Recarregar ${model.caixinhas[chave].nome}`,
      sub: isTag ? "O valor cobrado é maior que o disponível" : "Sem tarifa",
      faixas: isTag ? FAIXAS_TAG : FAIXAS_ZONA,
      onOk: (faixa) => {
        const tarifa = faixa.custo - faixa.disponivel;
        dispatch({ type: "recarregarCaixinha", chave, mes, movId: uid(), disponivel: faixa.disponivel, custo: faixa.custo, tarifa });
        fechar();
        mostrarToast(tarifa > 0 ? `Pagou ${fmt(faixa.custo)} · entrou ${fmt(faixa.disponivel)}` : `Recarregado ${fmt(faixa.disponivel)}`);
      },
    });
  }

  function gastarCaixinha(chave: string) {
    const saldo = saldoCaixinha(model.caixinhas[chave].mov);
    setModal({
      tipo: "valor",
      titulo: `Gasto · ${model.caixinhas[chave].nome}`,
      sub: `Saldo: ${fmt(saldo)}`,
      valorInicial: "",
      onOk: (v) => {
        const val = parseFloat(v.replace(",", ".")) || 0;
        fechar();
        if (val <= 0) return;
        dispatch({ type: "gastarCaixinha", chave, mes, movId: uid(), valor: val });
        mostrarToast(`Restam ${fmt(saldo - val)}`);
      },
    });
  }

  function editarValorComEscopo(tipo: "despesa" | "receita", id: string, nomeValor: string) {
    const valor = parseFloat(nomeValor.replace(",", ".")) || 0;
    setModal({
      tipo: "escopo",
      titulo: "Aplicar em qual período?",
      onOk: (soNesseMes) => {
        dispatch({ type: "editarValor", tipo, itemId: id, mes, valor, soNesseMes });
        fechar();
        mostrarToast(soNesseMes ? "Ajustado neste mês" : "Ajustado em todos os meses");
      },
    });
  }

  function editarEstadoDireto(id: string, campo: "pago" | "separado" | "recebido" | "devolvido", v: string) {
    dispatch({ type: "editarEstado", mes, itemId: id, campo, valor: parseFloat(v.replace(",", ".")) || 0 });
  }

  const bloco = (label: string, sub: string, qz: Quinzena) => {
    const rs = receitas.filter((r) => r.q === qz);
    const ds = despesas.filter((d) => d.q === qz);
    const cs = cartoes.filter((c) => c.q === qz);
    return (
      <div key={qz}>
        <div style={{ margin: "18px 0 6px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: T.ink, letterSpacing: "0.05em" }}>{label}</div>
          <div style={{ fontSize: 10, color: T.inkSoft }}>{sub}</div>
        </div>

        <Card style={{ padding: "3px 15px", background: T.sageSoft, borderColor: "#C3D5C4" }}>
          {rs.map((r) => {
            const e = estadoDeId(r.id);
            const ok = e.recebido != null;
            return (
              <div key={r.id}>
                <Linha
                  ic={r.icone}
                  nome={r.nome}
                  meta={r.quando}
                  valor={e.recebido ?? r.valor}
                  cor={T.sage}
                  sinal="+"
                  editavel
                  onEditar={(v) => (ok ? editarEstadoDireto(r.id, "recebido", v) : editarValorComEscopo("receita", r.id, v))}
                  btns={[{ t: ok ? "✓ caiu" : "Caiu", on: () => receber(r), ativo: ok }]}
                />
                {r.dizimo &&
                  (() => {
                    const dev = e.devolvido != null;
                    const val = dev ? e.devolvido! : ok ? dizimoDe(r, e, impostoRafaelValor, contadorValor) : dizimoPrevisto(r, impostoRafaelValor, contadorValor);
                    return (
                      <Linha
                        ic="🙏"
                        nome="Dízimo"
                        meta={dev ? "devolvido" : ok ? "a devolver" : "previsto"}
                        valor={val}
                        cor={T.brick}
                        sinal="−"
                        riscado={dev}
                        editavel={dev}
                        onEditar={(v) => editarEstadoDireto(r.id, "devolvido", v)}
                        btns={[{ t: dev ? "✓ devolvido" : "Devolver", on: () => devolver(r), ativo: dev }]}
                      />
                    );
                  })()}
              </div>
            );
          })}
        </Card>

        <Card style={{ padding: "3px 15px" }}>
          {cs.map((ct) => {
            const e = estadoDeId(ct.id);
            const pago = e.pago != null;
            const sep = e.separado != null;
            const av = avisoDe(ct.id);
            const btns: Btn2[] = pago
              ? [{ t: "✓ pago", on: () => dispatch({ type: "desPagar", mes, itemId: ct.id }), ativo: true }]
              : sep
                ? [{ t: "🫙", on: () => dispatch({ type: "desSeparar", mes, itemId: ct.id }), azul: true }, { t: "Pagar", on: () => pagar(ct.id, ct.nome) }]
                : [{ t: "Separar", on: () => separar(ct.id, ct.nome, ct.valor), azul: true }, { t: "Pagar", on: () => pagar(ct.id, ct.nome) }];
            return (
              <Linha
                key={ct.id}
                ic={ct.icone}
                nome={ct.nome}
                meta={pago ? "pago" : sep ? "separado, esperando a fatura" : av ? textoAviso(av.dias) : ct.vencimento ? `vence dia ${ct.vencimento}` : "sem data"}
                valor={pago ? e.pago! : sep ? e.separado! : ct.valor}
                cor={T.brick}
                sinal="−"
                riscado={pago}
                alerta={!!av && av.dias < 0 && !pago}
                editavel
                onEditar={(v) => (pago ? editarEstadoDireto(ct.id, "pago", v) : sep ? editarEstadoDireto(ct.id, "separado", v) : undefined)}
                btns={btns}
              />
            );
          })}
          {ds.map((d) => {
            const e = estadoDeId(d.id);
            const st = estadoDe(e);
            const gasto = gastoTotal(e.gastos);
            const saldoCx = (e.separado || 0) - gasto;
            const media = mediaRealDe(d.id, d.overrides, model.estados, mes);
            const v = st === "pago" ? e.pago! : st === "separado" ? saldoCx : previsto(d.valor, media);
            const av = avisoDe(d.id);
            const metaBase =
              st === "pago"
                ? "pago"
                : st === "separado"
                  ? gasto > 0
                    ? `separou ${fmt(e.separado)} · gastou ${fmt(gasto)}`
                    : `separado · ${fmt(e.separado)}`
                  : av
                    ? textoAviso(av.dias)
                    : d.parcelaInfo
                      ? d.dia
                        ? `dia ${d.dia}`
                        : "sem data"
                      : media
                        ? `média real ${fmt(media.media)}`
                        : d.dia
                          ? `dia ${d.dia}`
                          : "sem data";
            const meta = d.parcelaInfo ? `${d.parcelaInfo.atual}/${d.parcelaInfo.total} · ${metaBase}` : metaBase;
            const btns: Btn2[] =
              st === "pago"
                ? [{ t: "✓ pago", on: () => dispatch({ type: "desPagar", mes, itemId: d.id }), ativo: true }]
                : st === "separado"
                  ? [{ t: "＋", on: () => addGastoEm(d.id, d.nome), azul: true }, { t: "Pagar", on: () => pagar(d.id, d.nome) }]
                  : [{ t: "Separar", on: () => separar(d.id, d.nome, previsto(d.valor, media)), azul: true }, { t: "Pagar", on: () => pagar(d.id, d.nome) }];
            const exp = aberto === d.id;
            return (
              <div key={d.id}>
                <Linha
                  ic={d.icone}
                  nome={d.nome}
                  meta={meta}
                  valor={v}
                  cor={T.brick}
                  sinal="−"
                  riscado={st === "pago"}
                  alerta={!!av && av.dias < 0 && st !== "pago"}
                  editavel
                  onEditar={(nv) => (st === "pago" ? editarEstadoDireto(d.id, "pago", nv) : st === "separado" ? editarEstadoDireto(d.id, "separado", nv) : editarValorComEscopo("despesa", d.id, nv))}
                  btns={btns}
                  onNome={e.gastos.length > 0 || st === "separado" ? () => setAberto(exp ? null : d.id) : undefined}
                />
                {st === "separado" && exp && (
                  <div style={{ padding: "4px 0 10px 24px" }}>
                    {e.gastos.length === 0 && <div style={{ fontSize: 10.5, color: T.inkSoft, padding: "3px 0" }}>Nenhum gasto ainda — use o ＋</div>}
                    {e.gastos.map((g) => (
                      <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: T.inkSoft, padding: "3px 0" }}>
                        <span>{g.data}</span>
                        <span style={{ display: "flex", gap: 7, alignItems: "center" }}>
                          <b>{fmt(g.valor)}</b>
                          <span onClick={() => dispatch({ type: "delGasto", mes, itemId: d.id, gastoId: g.id })} style={{ cursor: "pointer", color: T.brick }}>
                            ✕
                          </span>
                        </span>
                      </div>
                    ))}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        fontWeight: 700,
                        paddingTop: 5,
                        borderTop: `1px solid ${T.line}`,
                        marginTop: 4,
                        color: saldoCx < 0 ? T.brick : T.blue,
                      }}
                    >
                      <span>{saldoCx < 0 ? "estourou" : "ainda tem"}</span>
                      <span>{fmt(Math.abs(saldoCx))}</span>
                    </div>
                    <div onClick={() => fecharCaixinha(d.id)} style={{ fontSize: 10.5, color: T.gold, fontWeight: 700, cursor: "pointer", marginTop: 7 }}>
                      Fechar caixinha e dar baixa →
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    );
  };

  return (
    <div>
      <Topo titulo="Calendário" onClose={onClose} />
      <NavMes mes={mes} setMes={setMes} />
      <div style={{ background: livre.livre >= 0 ? T.ink : T.brick, borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 10.5, color: "#D5DAD2", fontWeight: 700 }}>LIVRE PARA GASTAR</div>
        <div style={{ fontFamily: fontSerif, fontSize: 26, color: T.paper, fontWeight: 600 }}>{fmt(livre.livre)}</div>
        {livre.saldoInicial > 0 && <div style={{ fontSize: 10, color: "#D5DAD2" }}>inclui {fmt(livre.saldoInicial)} do mês anterior</div>}
      </div>

      {bloco("1ª quinzena", "vence até dia 15 · pago com o salário do dia 30 anterior", "Q1")}
      {bloco("2ª quinzena", "vence do dia 16 em diante · pago com o salário do dia 15", "Q2")}

      <div style={{ margin: "18px 0 6px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: T.ink, letterSpacing: "0.05em" }}>ZUL</div>
        <div style={{ fontSize: 10, color: T.inkSoft }}>saldo atravessa os meses · só a recarga entra no mês</div>
      </div>
      {Object.entries(model.caixinhas).map(([chave, cx]) => {
        const exp = cxAberta === chave;
        const saldo = saldoCaixinha(cx.mov);
        const movMes = cx.mov.filter((m) => m.mes === mes);
        const recargaMes = movMes.filter((m) => m.tipo === "recarga").reduce((s, m) => s + (m.custo ?? 0), 0);
        return (
          <Card key={chave} style={{ padding: "3px 15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0" }}>
              <div onClick={() => setCxAberta(exp ? null : chave)} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer", minWidth: 0 }}>
                <span style={{ fontSize: 14 }}>{cx.icone}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>
                    {cx.nome}
                    <span style={{ color: T.blue, fontSize: 9, marginLeft: 3 }}>▾</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: T.inkSoft }}>{recargaMes > 0 ? `recarregou ${fmt(recargaMes)} este mês` : "sem recarga este mês"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <b style={{ color: saldo > 0 ? T.blue : T.inkSoft, fontFamily: fontSerif, fontSize: 12.5 }}>{fmt(saldo)}</b>
                <div
                  onClick={() => recarregarCaixinha(chave)}
                  style={{ fontSize: 9.5, fontWeight: 700, padding: "5px 7px", borderRadius: 7, cursor: "pointer", background: T.goldSoft, color: "#7A5A20" }}
                >
                  Recarregar
                </div>
                <div
                  onClick={() => gastarCaixinha(chave)}
                  style={{ fontSize: 9.5, fontWeight: 700, padding: "5px 8px", borderRadius: 7, cursor: "pointer", background: T.blueSoft, color: T.blue }}
                >
                  ＋
                </div>
              </div>
            </div>
            {exp && (
              <div style={{ padding: "2px 0 10px 22px" }}>
                {cx.mov.length === 0 && <div style={{ fontSize: 10.5, color: T.inkSoft, padding: "3px 0" }}>Sem movimentação ainda</div>}
                {cx.mov.slice(0, 12).map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, padding: "3px 0", color: T.inkSoft }}>
                    <span>
                      {m.data} · {m.tipo === "recarga" ? `recarga${m.tarifa ? ` (tarifa ${fmt(m.tarifa)})` : ""}` : "gasto"}
                    </span>
                    <span style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <b style={{ color: m.tipo === "recarga" ? T.sage : T.brick }}>{m.tipo === "recarga" ? `+${fmt(m.disponivel)}` : `−${fmt(m.valor)}`}</b>
                      <span onClick={() => dispatch({ type: "delMovCaixinha", chave, movId: m.id })} style={{ cursor: "pointer", color: T.brick }}>
                        ✕
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {modal?.tipo === "escopo" && <ModalEscopo mes={mes} titulo={modal.titulo} onOk={modal.onOk} onNo={fechar} />}
      {modal?.tipo === "valor" && <ModalValor titulo={modal.titulo} sub={modal.sub} valorInicial={modal.valorInicial} onOk={modal.onOk} onNo={fechar} />}
      {modal?.tipo === "faixas" && <ModalFaixas titulo={modal.titulo} sub={modal.sub} faixas={modal.faixas} onOk={modal.onOk} onNo={fechar} />}
    </div>
  );
}
