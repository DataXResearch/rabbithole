<script>
  import { onMount } from "svelte";
  import { Agent } from "@atproto/api";

  let isLoading = false;
  let error = null;
  let isAuthenticated = false;
  let userDisplayName = null;
  let userHandle = null;
  let userAvatar = null;
  let showHandleInput = false;
  let handleInput = "";
  let inputElement;
  let dpopKeyPair = null;

  const CLIENT_ID = "https://rabbithole.to/oauth/client-metadata.json";
  const REDIRECT_URI = chrome.identity.getRedirectURL("callback");
  const STORAGE_KEY = "rabbithole_bsky_session";
  const DPOP_KEY_STORAGE = "rabbithole_dpop_key";

  onMount(async () => {
    console.log("Redirect URI:", REDIRECT_URI);
    await restoreSession();
  });

  async function restoreSession() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY];
      if (stored) {
        await fetchProfile(stored);
      }
    } catch (err) {
      console.error("Failed to restore session:", err);
      await chrome.storage.local.remove(STORAGE_KEY);
    }
  }

  async function fetchProfile(session) {
    const agent = new Agent("https://public.api.bsky.app");
    const response = await agent.getProfile({ actor: session.did });

    if (!response.success) {
      throw new Error("Failed to fetch profile");
    }

    isAuthenticated = true;
    userDisplayName = response.data.displayName || response.data.handle;
    userHandle = response.data.handle;
    userAvatar = response.data.avatar;
    console.log(response)
  }

  function openHandleInput() {
    showHandleInput = true;
    error = null;
    setTimeout(() => inputElement?.focus(), 0);
  }

  function cancelHandleInput() {
    showHandleInput = false;
    handleInput = "";
    error = null;
  }

  function generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
  }

  function base64UrlEncode(buffer) {
    let binary = "";
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(digest));
  }

  async function generateDpopKeyPair() {
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

  async function exportPublicKeyJwk(publicKey) {
    const jwk = await crypto.subtle.exportKey("jwk", publicKey);
    return {
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
    };
  }

  async function createDpopProof(httpMethod, httpUri, keyPair, nonce = null, ath = null) {
    const publicJwk = await exportPublicKeyJwk(keyPair.publicKey);

    const header = {
      alg: "ES256",
      typ: "dpop+jwt",
      jwk: publicJwk,
    };

    const payload = {
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

  async function resolveHandleAndPds(handle) {
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
          (s) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
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

  async function getAuthServerMetadata(pdsUrl) {
    const response = await fetch(`${pdsUrl}/.well-known/oauth-authorization-server`);
    if (!response.ok) {
      throw new Error("Failed to fetch authorization server metadata");
    }
    return await response.json();
  }

  async function exchangeCodeForTokens(code, codeVerifier, tokenEndpoint, keyPair) {
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
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
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
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
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

  async function submitHandle() {
    if (!handleInput.trim()) {
      error = "Please enter your handle";
      return;
    }

    error = null;
    isLoading = true;
    showHandleInput = false;

    try {
      let handle = handleInput.trim();
      if (!handle.includes(".")) {
        handle = `${handle}.bsky.social`;
      }

      const { did, pdsUrl } = await resolveHandleAndPds(handle);
      console.log("Resolved handle:", { did, pdsUrl, handle });

      const authServer = await getAuthServerMetadata(pdsUrl);
      console.log("Auth server metadata:", authServer);

      // Generate DPoP key pair
      dpopKeyPair = await generateDpopKeyPair();
      console.log("Generated DPoP key pair");

      const codeVerifier = generateRandomString(32);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomString(16);

      console.log("PKCE - state:", state);

      const authUrl = new URL(authServer.authorization_endpoint);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("scope", "atproto");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("login_hint", handle);

      console.log("Opening auth URL:", authUrl.toString());

      // Use chrome.identity.launchWebAuthFlow
      const callbackUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true,
      });

      console.log("Callback URL:", callbackUrl);

      if (!callbackUrl) {
        throw new Error("Authentication was cancelled");
      }

      // Parse the callback URL
      const url = new URL(callbackUrl);
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const oauthError = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (oauthError) {
        throw new Error(errorDescription || oauthError);
      }

      if (returnedState !== state) {
        throw new Error("OAuth state mismatch");
      }

      if (!code) {
        throw new Error("No authorization code received");
      }

      console.log("Exchanging code for tokens...");
      const tokenResponse = await exchangeCodeForTokens(code, codeVerifier, authServer.token_endpoint, dpopKeyPair);
      console.log("Token response received");

      const session = {
        did,
        handle,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenEndpoint: authServer.token_endpoint,
      };

      await chrome.storage.local.set({ [STORAGE_KEY]: session });

      await fetchProfile(session);
      error = null;
    } catch (err) {
      console.error("OAuth error:", err);
      error = err.message || "Failed to start authentication";
    }

    isLoading = false;
    handleInput = "";
  }

  function handleKeydown(event) {
    if (event.key === "Enter") {
      submitHandle();
    } else if (event.key === "Escape") {
      cancelHandleInput();
    }
  }

  async function handleLogout() {
    await chrome.storage.local.remove(STORAGE_KEY);
    isAuthenticated = false;
    userDisplayName = null;
    userHandle = null;
    userAvatar = null;
  }
</script>

<div class="auth-container">
  {#if isAuthenticated}
    <div class="auth-status">
      <div class="user-info">
        {#if userAvatar}
          <img src={userAvatar} alt={userDisplayName} class="user-avatar" />
        {/if}
        <span class="user-handle" title={userHandle}>{userDisplayName}</span>
      </div>
      <button class="auth-button logout" on:click={handleLogout}>
        Logout
      </button>
    </div>
  {:else if showHandleInput}
    <div class="handle-input-container">
      <input
        type="text"
        class="handle-input"
        placeholder="user.bsky.social"
        bind:value={handleInput}
        bind:this={inputElement}
        on:keydown={handleKeydown}
      />
      <div class="handle-buttons">
        <button class="auth-button cancel" on:click={cancelHandleInput}>
          Cancel
        </button>
        <button class="auth-button login" on:click={submitHandle}>
          Connect
        </button>
      </div>
    </div>
  {:else}
    <button
      class="auth-button login"
      on:click={openHandleInput}
      disabled={isLoading}
    >
      {#if isLoading}
        Connecting...
      {:else}
        Connect Bluesky
      {/if}
    </button>
  {/if}

  {#if error}
    <p class="error-message">{error}</p>
  {/if}
</div>

<style>
  .auth-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 16px;
  }

  .auth-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #eee;
  }

  .user-handle {
    font-size: 14px;
    color: #666;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .handle-input-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 280px;
  }

  .handle-input {
    padding: 10px 14px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    background: white;
    color: #333;
  }

  .handle-input:focus {
    border-color: #1185fe;
  }

  .handle-input::placeholder {
    color: #999;
  }

  .handle-buttons {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .auth-button {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, opacity 0.2s;
  }

  .auth-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .auth-button.login,
  .auth-button.logout {
    background-color: #1185fe;
    color: white;
  }

  .auth-button.login:hover:not(:disabled),
  .auth-button.logout:hover {
    background-color: #0070e0;
  }

  .auth-button.cancel {
    background-color: #e4e6eb;
    color: #333;
  }

  .auth-button.cancel:hover {
    background-color: #d4d6db;
  }

  .error-message {
    color: #dc3545;
    font-size: 13px;
    margin: 0;
  }

  /* Dark mode */
  :global(body.dark-mode) .user-handle {
    color: #a0a0a0;
  }

  :global(body.dark-mode) .user-avatar {
    border-color: #3a3b3c;
  }

  :global(body.dark-mode) .handle-input {
    background: #2c2e33;
    border-color: #3a3b3c;
    color: #e4e6eb;
  }

  :global(body.dark-mode) .handle-input:focus {
    border-color: #1185fe;
  }

  :global(body.dark-mode) .handle-input::placeholder {
    color: #666;
  }

  :global(body.dark-mode) .auth-button.cancel {
    background-color: #3a3b3c;
    color: #e4e6eb;
  }

  :global(body.dark-mode) .auth-button.cancel:hover {
    background-color: #4a4b4c;
  }
</style>
