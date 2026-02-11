import { Agent } from "@atproto/api";

export const ClientMetadataUrl = "https://rabbithole.to/oauth/client-metadata.json";
const SessionStorageKey = "rabbithole_bsky_session";
const DpopKeyStorageKey = "rabbithole_dpop_key";

/* Session Manager */

export async function getSession() {
  const result = await chrome.storage.local.get(SessionStorageKey);
  return result[SessionStorageKey];
}

export async function saveSession(session: any) {
  await chrome.storage.local.set({ [SessionStorageKey]: session });
}

export async function clearSession() {
  await chrome.storage.local.remove([SessionStorageKey, DpopKeyStorageKey]);
}

/* DPoP utils */

export async function saveDpopKey(keyPair: CryptoKeyPair) {
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  await chrome.storage.local.set({ [DpopKeyStorageKey]: { private: privateJwk, public: publicJwk } });
}

export async function getDpopKey(): Promise<CryptoKeyPair | null> {
  const stored = await chrome.storage.local.get(DpopKeyStorageKey);
  const keys = stored[DpopKeyStorageKey];
  if (!keys) return null;

  try {
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      keys.private,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      keys.public,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"]
    );

    return { privateKey, publicKey };
  } catch (e) {
    console.error("Invalid DPoP keys in storage, clearing...", e);
    await chrome.storage.local.remove(DpopKeyStorageKey);
    return null;
  }
}

export function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export async function generateDpopKeyPair(): Promise<CryptoKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
  return keyPair;
}

export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  return {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y,
  };
}

export async function createDpopProof(
  httpMethod: string,
  httpUri: string,
  keyPair: CryptoKeyPair,
  nonce: string | null = null,
  ath: string | null = null
): Promise<string> {
  const publicJwk = await exportPublicKeyJwk(keyPair.publicKey);

  const header = {
    alg: "ES256",
    typ: "dpop+jwt",
    jwk: publicJwk,
  };

  const payload: any = {
    jti: generateRandomString(16),
    htm: httpMethod,
    htu: httpUri,
    iat: Math.floor(Date.now() / 1000),
  };

  if (nonce) {
    payload.nonce = nonce;
  }

  if (ath) {
    payload.ath = ath;
  }

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  );

  // Convert signature from DER to raw format (r || s)
  const signatureArray = new Uint8Array(signature);
  const encodedSignature = base64UrlEncode(signatureArray);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/* ATProto auth */

export async function resolveHandleAndPds(handle: string): Promise<{ did: string; pdsUrl: string; handle: string }> {
  const agent = new Agent("https://bsky.social");
  const resolved = await agent.resolveHandle({ handle });

  if (!resolved.success) {
    throw new Error("Failed to resolve handle");
  }

  const did = resolved.data.did;

  let pdsUrl = "https://bsky.social";
  try {
    const plcResponse = await fetch(`https://plc.directory/${did}`);
    if (plcResponse.ok) {
      const didDoc = await plcResponse.json();
      const pdsService = didDoc.service?.find(
        (s: any) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
      );
      if (pdsService) {
        pdsUrl = pdsService.serviceEndpoint;
      }
    }
  } catch (err) {
    console.warn("Failed to resolve PDS, using default:", err);
  }

  return { did, pdsUrl, handle };
}

export async function getAuthServerMetadata(pdsUrl: string): Promise<any> {
  const response = await fetch(`${pdsUrl}/.well-known/oauth-authorization-server`);
  if (!response.ok) {
    throw new Error("Failed to fetch authorization server metadata");
  }
  return await response.json();
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  tokenEndpoint: string,
  keyPair: CryptoKeyPair,
  redirectUri: string,
  clientId: string
): Promise<any> {
  // First attempt without nonce
  let dpopProof = await createDpopProof("POST", tokenEndpoint, keyPair);

  let response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "DPoP": dpopProof,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    }),
  });

  // If we get a use_dpop_nonce error, retry with the nonce
  if (response.status === 400 || response.status === 401) {
    const dpopNonce = response.headers.get("DPoP-Nonce");
    if (dpopNonce) {
      console.log("Retrying with DPoP nonce:", dpopNonce);
      dpopProof = await createDpopProof("POST", tokenEndpoint, keyPair, dpopNonce);

      response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "DPoP": dpopProof,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri,
          client_id: clientId,
          code_verifier: codeVerifier,
        }),
      });
    }
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error("Token exchange failed:", response.status, errText);
    throw new Error("Failed to exchange code for tokens");
  }

  return await response.json();
}

/* Record operations */

async function authenticatedFetch(url: string, method: string, body: any = null) {
  const session = await getSession();
  if (!session) throw new Error("No session found");

  const keyPair = await getDpopKey();
  if (!keyPair) throw new Error("No DPoP key found");

  const accessTokenHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(session.accessToken));
  const ath = base64UrlEncode(new Uint8Array(accessTokenHash));

  let proof = await createDpopProof(method, url, keyPair, null, ath);

  const headers: any = {
    "Authorization": `DPoP ${session.accessToken}`,
    "DPoP": proof
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  let response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 401) {
    const nonce = response.headers.get("DPoP-Nonce");
    if (nonce) {
      proof = await createDpopProof(method, url, keyPair, nonce, ath);
      headers["DPoP"] = proof;
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    }
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function createRecord(
  repo: string,
  collection: string,
  record: any
): Promise<{ uri: string; cid: string }> {
  const session = await getSession();
  if (!session) throw new Error("No session found");

  const pdsUrl = session.pdsUrl || new URL(session.tokenEndpoint).origin;
  const url = `${pdsUrl}/xrpc/com.atproto.repo.createRecord`;

  const body = {
    repo,
    collection,
    record,
  };

  return authenticatedFetch(url, "POST", body);
}

export async function listRecords(
  repo: string,
  collection: string
): Promise<{ records: { uri: string; cid: string; value: any }[]; cursor?: string }> {
  const session = await getSession();
  if (!session) throw new Error("No session found");
  
  const pdsUrl = session.pdsUrl || new URL(session.tokenEndpoint).origin;
  const url = new URL(`${pdsUrl}/xrpc/com.atproto.repo.listRecords`);
  url.searchParams.set("repo", repo);
  url.searchParams.set("collection", collection);
  url.searchParams.set("limit", "100");

  return authenticatedFetch(url.toString(), "GET");
}

export async function deleteRecord(
  repo: string,
  collection: string,
  rkey: string
): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("No session found");
  
  const pdsUrl = session.pdsUrl || new URL(session.tokenEndpoint).origin;
  const url = `${pdsUrl}/xrpc/com.atproto.repo.deleteRecord`;
  
  await authenticatedFetch(url, "POST", { repo, collection, rkey });
}

export async function putRecord(
  repo: string,
  collection: string,
  rkey: string,
  record: any,
  swapRecord?: string
): Promise<{ uri: string; cid: string }> {
  const session = await getSession();
  if (!session) throw new Error("No session found");
  
  const pdsUrl = session.pdsUrl || new URL(session.tokenEndpoint).origin;
  const url = `${pdsUrl}/xrpc/com.atproto.repo.putRecord`;
  
  return authenticatedFetch(url, "POST", { repo, collection, rkey, record, swapRecord });
}
