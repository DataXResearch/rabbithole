<script>
  import { onMount } from "svelte";
  import { Agent } from "@atproto/api";
  import {
    ClientMetadataUrl,
    generateRandomString,
    generateCodeChallenge,
    generateDpopKeyPair,
    resolveHandleAndPds,
    getAuthServerMetadata,
    exchangeCodeForTokens,
    getSession,
    saveSession,
    clearSession
  } from "../atproto/client";

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

  const RedirectUri = chrome.identity.getRedirectURL("callback");

  onMount(async () => {
    console.log("Redirect URI:", RedirectUri);
    await restoreSession();
  });

  async function restoreSession() {
    try {
      const stored = await getSession();
      if (stored) {
        await fetchProfile(stored);
      }
    } catch (err) {
      console.error("Failed to restore session:", err);
      await clearSession();
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
      authUrl.searchParams.set("client_id", ClientMetadataUrl);
      authUrl.searchParams.set("redirect_uri", RedirectUri);
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
      const tokenResponse = await exchangeCodeForTokens(
        code,
        codeVerifier,
        authServer.token_endpoint,
        dpopKeyPair,
        RedirectUri,
        ClientMetadataUrl
      );
      console.log("Token response received");

      const session = {
        did,
        handle,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenEndpoint: authServer.token_endpoint,
      };

      await saveSession(session);

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
    await clearSession();
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
