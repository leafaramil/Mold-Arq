import crypto from 'crypto';

// Compara a senha de admin enviada com a variável de ambiente usando
// crypto.timingSafeEqual, em vez de "===" direto. Comparação normal de
// string vaza informação pelo tempo de resposta (para de comparar no
// primeiro caractere diferente); timingSafeEqual sempre leva o mesmo tempo,
// não importa onde a diferença está. Usado pelos três endpoints de admin
// (create-client, delete-client, list-clients) para não duplicar essa
// lógica em cada um.
export function isValidAdminPassword(candidate) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || typeof candidate !== 'string') return false;

  const expectedBuf = Buffer.from(expected);
  const candidateBuf = Buffer.from(candidate);

  // timingSafeEqual exige buffers do mesmo tamanho. Se o tamanho já for
  // diferente, sabemos que não bate — mas fazemos uma comparação "vazia"
  // mesmo assim, só para não vazar essa informação (tamanho certo ou
  // errado) por um caminho de código mais rápido.
  if (expectedBuf.length !== candidateBuf.length) {
    crypto.timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, candidateBuf);
}
