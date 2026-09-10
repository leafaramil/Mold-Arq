import { describe, expect, it, vi } from "vitest";
import { fetchComTimeout } from "../src/lib/mercados/fetch-timeout";

describe("fetchComTimeout", () => {
  it("devolve a resposta normalmente quando o fetch termina antes do timeout", async () => {
    const respostaFalsa = new Response("ok");
    const fetchFalso = vi.fn().mockResolvedValue(respostaFalsa);
    vi.stubGlobal("fetch", fetchFalso);
    try {
      const resp = await fetchComTimeout("https://exemplo.com", {}, 1000);
      expect(resp).toBe(respostaFalsa);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // O ponto central do fix: nenhuma busca de mercado tinha timeout próprio
  // antes — uma requisição travada consumia o orçamento de 60s da função
  // inteira sozinha. Simula um fetch que nunca resolve e confirma que o
  // timeout aborta em vez de ficar preso pra sempre.
  it("aborta e lança erro quando o fetch demora mais que o timeout", async () => {
    const fetchQueNuncaResolve = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    vi.stubGlobal("fetch", fetchQueNuncaResolve);
    try {
      await expect(fetchComTimeout("https://exemplo.com", {}, 20)).rejects.toThrow("sem resposta em 20ms");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("propaga erro de rede normal sem mexer na mensagem", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("falha de DNS")),
    );
    try {
      await expect(fetchComTimeout("https://exemplo.com", {}, 1000)).rejects.toThrow("falha de DNS");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
