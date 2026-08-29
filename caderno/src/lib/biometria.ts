"use client";

// Trava local por biometria (WebAuthn/Passkey), seção 11 da especificação.
// Não é autenticação num servidor — o app não tem níveis de permissão
// (seção 12), Rafael e Letícia veem tudo igual. É só um cadeado local:
// cada aparelho guarda sua própria credencial (numa chave privada que nunca
// sai do aparelho) e pede a digital/rosto pra "abrir o caderno", em vez de
// só tocar num nome. Por isso não há verificação de assinatura no servidor
// — a garantia de segurança já vem inteira do sistema operacional.

const bufferParaB64url = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64urlParaBuffer = (b64url: string): ArrayBuffer => {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

export async function suportaBiometria(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Cria a credencial biométrica deste aparelho. Retorna o id (p/ guardar localmente) ou null se cancelar/falhar. */
export async function registrarBiometria(nome: string): Promise<string | null> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Caderno" },
        user: { id: userId, name: nome, displayName: nome },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
        timeout: 60000,
        attestation: "none",
      },
    });
    if (!cred || !("rawId" in cred)) return null;
    return bufferParaB64url((cred as PublicKeyCredential).rawId);
  } catch {
    return null;
  }
}

/** Pede a digital/rosto pra confirmar a credencial já registrada. */
export async function desbloquearComBiometria(credentialId: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: b64urlParaBuffer(credentialId), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!cred;
  } catch {
    return false;
  }
}
