"use client";

import { useEffect, useRef } from "react";
import { pegarConstrutorSR, type SpeechRecognitionLike } from "./speech-types";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Escuta contínua em segundo plano (enquanto o app está aberto e em primeiro
 * plano) pelo nome do assistente. Ao ouvir o nome em qualquer tela, chama
 * onAcionar com o que foi dito depois do nome (pode ser vazio).
 *
 * Não é um wake-word nativo do sistema (tipo "OK Google") — um PWA não
 * consegue ouvir com a tela apagada ou em segundo plano. Funciona só
 * enquanto o Caderno está aberto e visível.
 */
export function useEscutaCuringa(ativo: boolean, nomeAssistente: string, onAcionar: (resto: string) => void) {
  const ativoRef = useRef(ativo);
  const nomeRef = useRef(nomeAssistente);
  const onAcionarRef = useRef(onAcionar);
  ativoRef.current = ativo;
  nomeRef.current = nomeAssistente;
  onAcionarRef.current = onAcionar;

  useEffect(() => {
    if (!ativo) return;
    const SR = pegarConstrutorSR();
    if (!SR) return;

    let parado = false;
    let permissaoNegada = false;
    let recAtual: SpeechRecognitionLike | null = null;

    function iniciar() {
      if (parado || permissaoNegada || !ativoRef.current || document.hidden) return;
      const r = new SR!();
      r.lang = "pt-BR";
      r.continuous = true;
      r.interimResults = false;
      r.onresult = (ev) => {
        const alvo = normalizar(nomeRef.current);
        if (!alvo) return;
        for (let i = ev.resultIndex ?? 0; i < ev.results.length; i++) {
          const transcript = ev.results[i][0].transcript;
          const pos = normalizar(transcript).indexOf(alvo);
          if (pos !== -1) {
            const resto = transcript
              .slice(pos + alvo.length)
              .replace(/^[\s,.:!?-]+/, "")
              .trim();
            onAcionarRef.current(resto);
          }
        }
      };
      r.onerror = (ev) => {
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") permissaoNegada = true;
      };
      r.onend = () => {
        if (!parado && !permissaoNegada && ativoRef.current && !document.hidden) setTimeout(iniciar, 400);
      };
      recAtual = r;
      try {
        r.start();
      } catch {
        // já tinha uma sessão rodando ou erro momentâneo — o onend cuida da próxima tentativa
      }
    }

    iniciar();

    const aoVisibilidade = () => {
      if (document.hidden) recAtual?.stop();
      else if (ativoRef.current) iniciar();
    };
    document.addEventListener("visibilitychange", aoVisibilidade);

    return () => {
      parado = true;
      document.removeEventListener("visibilitychange", aoVisibilidade);
      recAtual?.stop();
      recAtual = null;
    };
  }, [ativo]);
}
