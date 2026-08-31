export const fmt = (n: number | null | undefined): string =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Interpreta texto digitado como valor em reais, aceitando tanto o formato
 * brasileiro (vírgula decimal, ponto de milhar — "4.500,00") quanto o que um
 * `Number` vira em texto (ponto decimal — "4500.5", usado nos valores
 * sugeridos que pré-preenchem os campos).
 *
 * Existe porque os campos de valor do app são `type="text"` (não
 * `type="number"`): no Android, com o idioma do aparelho em português, o
 * teclado numérico do Chrome pro `type="number"` mostra vírgula como tecla
 * decimal — mas um `<input type="number">` só aceita ponto por spec, então o
 * navegador silenciosamente zera o campo (`.value` vira `""`) assim que a
 * vírgula é digitada, sem avisar. Isso já causou uma devolução de dízimo
 * registrada como R$ 0 (o dízimo real nunca foi subtraído do saldo).
 */
export function parseValorBR(bruto: string): number {
  let s = (bruto ?? "").trim();
  if (!s) return 0;
  s = s.replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const partes = s.split(".");
    if (partes.length > 1 && partes[partes.length - 1].length === 3) s = partes.join("");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export const hojeISO = (d: Date): string => d.toISOString().slice(0, 10);

export const uid = (): string => Math.random().toString(36).slice(2, 10);
