"use client";

import { useEffect, useRef, useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { fmt, hojeISO, uid } from "@/lib/format";
import { resolverDespesa } from "@/lib/calc";
import { retratoFinanceiro } from "@/lib/aristides";
import type { Action } from "@/lib/action-types";
import type { DataModel } from "@/lib/types";
import { Btn, Card, Topo } from "./ui";

interface Mensagem {
  de: "eu" | "ele";
  texto: string;
}

type Comando =
  | { acao: "gasto"; alvo: string; valor: number }
  | { acao: "separar"; alvo: string; valor: number }
  | { acao: "pagar"; alvo: string; valor: number }
  | { acao: "zul"; alvo: string; valor: number }
  | { acao: "erro"; motivo?: string };

const ROTULO: Record<string, string> = { gasto: "Registrar gasto", separar: "Separar", pagar: "Pagar", zul: "Gasto no ZUL" };

// Tipagem mínima do Web Speech API — não faz parte do lib.dom padrão do TS.
interface SpeechRecognitionResultLike {
  results: { [i: number]: { [j: number]: { transcript: string } } };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  onresult: ((ev: SpeechRecognitionResultLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export function Aristides({
  model,
  mes,
  nome,
  dispatch,
  onClose,
}: {
  model: DataModel;
  mes: string;
  nome: string;
  dispatch: (a: Action) => void;
  onClose: () => void;
}) {
  const [msgs, setMsgs] = useState<Mensagem[]>([{ de: "ele", texto: `Pois não. Pergunte o que quiser sobre suas contas, ou diga um gasto que eu anoto.` }]);
  const [txt, setTxt] = useState("");
  const [pensando, setPensando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [semRede, setSemRede] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [confirmar, setConfirmar] = useState<{ cmd: Comando; frase: string } | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setSemRede(false);
    const off = () => setSemRede(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [msgs, pensando]);

  function falar(texto: string) {
    if (!model.config.vozAtiva || typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }

  async function registrarConsumo(tokensEntrada: number, tokensSaida: number) {
    const custo = ((tokensEntrada / 1e6) * 3 + (tokensSaida / 1e6) * 15) * 5.4;
    if (custo > 0) dispatch({ type: "registrarConsumoIA", mes, custo });
  }

  async function perguntar(pergunta: string) {
    if (!pergunta.trim()) return;
    if (semRede) {
      setMsgs((m) => [...m, { de: "eu", texto: pergunta }, { de: "ele", texto: "Sem internet agora. Anote manualmente pelo calendário." }]);
      return;
    }
    setMsgs((m) => [...m, { de: "eu", texto: pergunta }]);
    setTxt("");
    setPensando(true);
    try {
      const retrato = retratoFinanceiro(model, mes, new Date());
      const resp = await fetch("/api/aristides/perguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta, retrato, nomeAssistente: nome }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.erro || "falha");
      setMsgs((m) => [...m, { de: "ele", texto: dados.texto }]);
      falar(dados.texto);
      await registrarConsumo(dados.tokensEntrada ?? 0, dados.tokensSaida ?? 0);
    } catch {
      setMsgs((m) => [...m, { de: "ele", texto: "Não consegui responder agora. Tente de novo." }]);
    }
    setPensando(false);
  }

  function ouvir() {
    if (semRede) {
      setMsgs((m) => [...m, { de: "ele", texto: "Sem internet. O microfone não funciona — anote manualmente." }]);
      return;
    }
    type SRWindow = typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const w = window as SRWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setMsgs((m) => [...m, { de: "ele", texto: "Este navegador não reconhece voz. Use o teclado." }]);
      return;
    }
    const r = new SR();
    r.lang = "pt-BR";
    r.continuous = false;
    r.interimResults = false;
    setOuvindo(true);
    r.onresult = async (ev) => {
      const frase = ev.results[0][0].transcript;
      setOuvindo(false);
      setMsgs((m) => [...m, { de: "eu", texto: frase }]);
      setPensando(true);
      try {
        const despesasDoMes = model.despesas.map((d) => resolverDespesa(d, mes)).filter((d): d is NonNullable<typeof d> => d !== null);
        const categorias = despesasDoMes.map((d) => `${d.id}: ${d.nome}`).join(", ");
        const resp = await fetch("/api/aristides/comando", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frase, categorias }),
        });
        const dados = await resp.json();
        if (!resp.ok) throw new Error(dados.erro || "falha");
        const cmd = dados.comando as Comando;
        await registrarConsumo(dados.tokensEntrada ?? 0, dados.tokensSaida ?? 0);
        if (cmd.acao === "erro") {
          setMsgs((m) => [...m, { de: "ele", texto: `Não entendi: ${cmd.motivo || "repita, por favor"}` }]);
        } else {
          setConfirmar({ cmd, frase });
        }
      } catch {
        setMsgs((m) => [...m, { de: "ele", texto: "Não consegui interpretar. Tente de novo." }]);
      }
      setPensando(false);
    };
    r.onerror = () => {
      setOuvindo(false);
      setMsgs((m) => [...m, { de: "ele", texto: "Não ouvi nada. Tente de novo." }]);
    };
    r.onend = () => setOuvindo(false);
    r.start();
  }

  function executar(cmd: Comando) {
    if (cmd.acao === "zul") {
      dispatch({ type: "gastarCaixinha", chave: cmd.alvo, mes, movId: uid(), valor: cmd.valor });
    } else if (cmd.acao === "gasto") {
      dispatch({ type: "addGasto", mes, itemId: cmd.alvo, valor: cmd.valor, data: hojeISO(new Date()), gastoId: uid() });
    } else if (cmd.acao === "separar") {
      dispatch({ type: "separar", mes, itemId: cmd.alvo, valor: cmd.valor });
    } else if (cmd.acao === "pagar") {
      dispatch({ type: "pagar", mes, itemId: cmd.alvo, valor: cmd.valor });
    }
  }

  const consumoMes = model.config.consumoIAMes[mes] || 0;

  return (
    <div>
      <Topo titulo={nome} sub={consumoMes > 0 ? `consumo do mês: ${fmt(consumoMes)}` : "seu consultor"} onClose={onClose} />

      {semRede && (
        <div style={{ background: T.brickSoft, borderRadius: 12, padding: 10, marginBottom: 10, fontSize: 11.5, color: "#7A3D2C", fontWeight: 600 }}>
          Sem internet — anote manualmente pelo calendário.
        </div>
      )}

      <Card ref={chatRef} style={{ minHeight: 240, maxHeight: 380, overflowY: "auto" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.de === "eu" ? "flex-end" : "flex-start", marginBottom: 9 }}>
            <div
              style={{
                maxWidth: "85%",
                padding: "9px 12px",
                borderRadius: 14,
                fontSize: 12.5,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                background: m.de === "eu" ? T.ink : T.paper,
                color: m.de === "eu" ? T.paper : T.ink,
                border: m.de === "eu" ? "none" : `1px solid ${T.line}`,
              }}
            >
              {m.texto}
            </div>
          </div>
        ))}
        {pensando && <div style={{ fontSize: 11.5, color: T.inkSoft, fontStyle: "italic" }}>pensando…</div>}
      </Card>

      {confirmar && (
        <Card style={{ borderColor: T.gold, background: T.goldSoft }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: T.inkSoft, fontWeight: 700, marginBottom: 6 }}>Confirma?</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 10 }}>
            {ROTULO[confirmar.cmd.acao]} · {fmt(confirmar.cmd.acao === "erro" ? 0 : confirmar.cmd.valor)}
            <div style={{ fontSize: 11, fontWeight: 400, color: T.inkSoft, marginTop: 2 }}>&quot;{confirmar.frase}&quot;</div>
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            <Btn
              v="sage"
              onClick={() => {
                executar(confirmar.cmd);
                setMsgs((m) => [...m, { de: "ele", texto: "Anotado." }]);
                setConfirmar(null);
              }}
              style={{ padding: 10, fontSize: 12 }}
            >
              Confirmar
            </Btn>
            <Btn
              v="ghost"
              onClick={() => {
                setConfirmar(null);
                setMsgs((m) => [...m, { de: "ele", texto: "Cancelado." }]);
              }}
              style={{ padding: 10, fontSize: 12 }}
            >
              Cancelar
            </Btn>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
        <input
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          placeholder="Pergunte ou digite um gasto…"
          onKeyDown={(e) => {
            if (e.key === "Enter") void perguntar(txt);
          }}
          style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${T.line}`, fontSize: 13, fontFamily: "inherit" }}
        />
        <div
          onClick={ouvir}
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: ouvindo ? T.brick : T.blue,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 19,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {ouvindo ? "●" : "🎤"}
        </div>
      </div>

      <div style={{ fontSize: 10, color: T.inkSoft, textAlign: "center", marginTop: 8 }}>
        Toque no microfone e fale: &quot;gastei 87 no mercado&quot; ou &quot;quanto sobra se eu pegar uma parcela de 1200?&quot;
      </div>
    </div>
  );
}
