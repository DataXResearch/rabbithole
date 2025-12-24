<script>
  import { onMount } from "svelte";
  import { Agent } from "@atproto/api";
  import { InfoCircled } from "radix-icons-svelte";
  import { Tooltip } from "@svelteuidev/core";
  import Modal from "./Modal.svelte";
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
    clearSession,
    saveDpopKey,
    getDpopKey
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
  let showWhyBlueskyModal = false;

  const RedirectUri = chrome.identity.getRedirectURL("callback");

  onMount(async () => {
    console.log("Redirect URI:", RedirectUri);
    await restoreSession();
  });

  async function restoreSession() {
    try {
      const stored = await getSession();
      if (stored) {
        // Verify we have valid DPoP keys
        const keys = await getDpopKey();
        if (!keys) {
          console.warn("Session exists but DPoP keys are missing or invalid. Clearing session.");
          await clearSession();
          return;
        }
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
      await saveDpopKey(dpopKeyPair);
      console.log("Generated and saved DPoP key pair");

      const codeVerifier = generateRandomString(32);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomString(16);

      console.log("PKCE - state:", state);

      const authUrl = new URL(authServer.authorization_endpoint);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", ClientMetadataUrl);
      authUrl.searchParams.set("redirect_uri", RedirectUri);
      // Request specific scopes for the custom collections
      authUrl.searchParams.set("scope", "atproto repo:network.cosmik.collection repo:network.cosmik.card repo:network.cosmik.collectionLink");
      // Force consent to ensure new scopes are granted
      authUrl.searchParams.set("prompt", "consent");
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
        pdsUrl,
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

<Modal
  isOpen={showWhyBlueskyModal}
  title="Why Bluesky?"
  on:close={() => (showWhyBlueskyModal = false)}
>
  <p><strong>Bluesky is built on the AT Protocol, the foundation of the new open web.</strong></p>
  <p>
    By connecting your Bluesky account, you can:
  </p>
  <ul style="padding-left: 20px; margin-top: 10px; margin-bottom: 20px;">
    <li style="margin-bottom: 8px;">
      <strong>Own your Rabbitholes.</strong> We do not store any of your information (nor do we want to).
      All your data is tied to your AT Protocol handle and stored in your personal
      data repository.
    </li>
    <li style="margin-bottom: 8px;">
      <strong>Share your rabbithole info with other apps.</strong> For e.g. share your
      rabbitholes as curated collections on the Semble network.
    </li>
    <li>
      <strong>Control your data.</strong> Your collections are stored in your personal
      data repository, not locked in a walled garden.
    </li>
  </ul>
  <p>👀 Coming soon:</p>
  <ul style="padding-left: 20px;">
    <li>Create a <a href="https://sidetrail.app" target="_blank" rel="noopener noreferrer">Sidetrail</a></li>
    <li>Add annotations with <a href="https://seams.so/" target="_blank" rel="noopener noreferrer">Seams</a></li>
  </ul>
  <p style="margin-top: 20px;">
    <a href="https://overreacted.io/open-social/" target="_blank" rel="noopener noreferrer">Learn more</a>
  </p>
</Modal>

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
    <div class="connect-wrapper">
      <button
        class="auth-button login"
        on:click={openHandleInput}
        disabled={isLoading}
      >
        <svg
          viewBox="0 0 568 500"
          style="width: 18px; height: 18px; margin-right: 8px; fill: currentColor;"
        >
          <path
            d="M123.121 33.664C186.071 80.918 253.774 176.746 278.631 228.165C303.488 176.746 371.19 80.918 434.141 33.664C479.563 -0.436 553.163 -26.817 553.163 57.146C553.163 73.915 543.548 198.012 537.909 218.158C518.31 288.193 446.889 306.058 383.356 295.245C494.411 314.146 522.663 376.754 461.65 439.362C345.772 558.273 295.101 409.542 282.112 371.426C279.732 364.44 278.618 361.171 278.602 363.951C278.585 361.171 277.472 364.44 275.092 371.426C262.102 409.542 211.431 558.273 95.553 439.362C34.54 376.754 62.792 314.146 173.847 295.245C110.314 306.058 38.893 288.193 19.294 218.158C13.655 198.012 4.04 73.915 4.04 57.146C4.04 -26.817 77.64 -0.436 123.121 33.664Z"
          />
        </svg>
        {#if isLoading}
          Connecting...
        {:else}
          Connect Bluesky
        {/if}
      </button>
      <Tooltip label="Why Bluesky?" withArrow>
        <button
          class="info-icon-btn"
          on:click={() => (showWhyBlueskyModal = true)}
        >
          <InfoCircled />
        </button>
      </Tooltip>
    </div>
  {/if}

  {#if error}
    <p class="error-message">{error}</p>
  {/if}
</div>

<style>
  a {
    color: #1185fe;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

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
    transition:
      background-color 0.2s,
      opacity 0.2s;
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

  .auth-button.login {
    display: flex;
    align-items: center;
    justify-content: center;
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

  .connect-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .info-icon-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: #333;
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

  :global(body.dark-mode) .info-icon-btn {
    color: #a0a0a0;
  }

  :global(body.dark-mode) .info-icon-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #e4e6eb;
  }
</style>
