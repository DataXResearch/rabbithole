<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { Agent } from "@atproto/api";
  import { InfoCircled } from "radix-icons-svelte";
  import CollapsibleContainer from "./CollapsibleContainer.svelte";
  import {
    getDpopKey,
    getSession,
    saveSession,
    clearSession,
    startAuthFlow,
  } from "../atproto/client";
  import type { ATProtoSession } from "../atproto/client";

  export let showWhyBluesky: boolean = false;

  const dispatch = createEventDispatcher();

  let isLoading: boolean = false;
  let error: string = null;
  let isAuthenticated: boolean = false;
  let userDisplayName: string = null;
  let userHandle: string = null;
  let userAvatar: string = null;
  let handleInput: string = "";

  onMount(async () => {
    await restoreSession();
  });

  async function restoreSession(): Promise<void> {
    try {
      const stored = await getSession();
      if (stored) {
        // Verify we have valid DPoP keys
        const keys = await getDpopKey();
        if (!keys) {
          await clearSession();
          return;
        }
        await fetchProfile(stored);
      }
    } catch (err) {
      await clearSession();
    }
  }

  async function fetchProfile(session: ATProtoSession): Promise<void> {
    const agent = new Agent("https://public.api.bsky.app");
    const response = await agent.getProfile({ actor: session.did });

    if (!response.success) {
      throw new Error("Failed to fetch profile");
    }

    isAuthenticated = true;
    userDisplayName = response.data.displayName || response.data.handle;
    userHandle = response.data.handle;
    userAvatar = response.data.avatar;
  }

  async function submitHandle(): Promise<void> {
    error = null;
    isLoading = true;

    try {
      const result = await startAuthFlow(handleInput);

      const session = {
        did: result.did,
        handle: result.handle,
        pdsUrl: result.pdsUrl,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenEndpoint: result.tokenEndpoint,
      };

      await saveSession(session);

      await fetchProfile(session);
      error = null;
      dispatch("authSuccess");
    } catch (err) {
      error = err.message || "Failed to start authentication";
    }

    isLoading = false;
    handleInput = "";
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      submitHandle();
    }
  }

  async function handleLogout(): Promise<void> {
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
  {:else}
    <div class="handle-input-container">
      <div class="bluesky-info">
        <InfoCircled size={16} />
        <span
          >You can use your <a
            href="https://bsky.app"
            target="_blank"
            rel="noopener noreferrer">Bluesky</a
          > handle</span
        >
      </div>

      <input
        type="text"
        class="handle-input"
        placeholder="user.bsky.social"
        bind:value={handleInput}
        on:keydown={handleKeydown}
      />
      <button
        class="auth-button login"
        on:click={submitHandle}
        disabled={isLoading}
      >
        {#if isLoading}
          Connecting...
        {:else}
          Sign in
        {/if}
      </button>
    </div>

    {#if showWhyBluesky}
      <div class="why-bluesky-wrapper">
        <CollapsibleContainer title="Why Internet Handle?" defaultOpen={false}>
          <div class="why-bluesky-content">
            <ul
              style="padding-left: 20px; margin-top: 10px; margin-bottom: 20px;"
            >
              <li style="margin-bottom: 8px;">
                <strong>Own your Rabbitholes.</strong> We do not store any of
                your information (nor do we want to). All your data is tied to
                your handle and
                <strong>you control where it's stored</strong>
              </li>
              <li style="margin-bottom: 8px;">
                <strong>Share your Rabbithole info with other apps.</strong> For
                e.g. share your rabbitholes as curated collections on the
                <a href="https://semble.so">Semble network</a>.
              </li>
              <li>
                <strong>Control your data.</strong> Your collections are stored in
                your personal data repository, not locked in a walled garden.
              </li>
            </ul>
            <p style="margin-top: 20px;">
              <a
                href="https://overreacted.io/open-social/"
                target="_blank"
                rel="noopener noreferrer"
                >Learn more about the open social web</a
              >
            </p>
            <p>👀 Coming soon:</p>
            <ul style="padding-left: 20px;">
              <li>
                Create a <a
                  href="https://sidetrail.app"
                  target="_blank"
                  rel="noopener noreferrer">Sidetrail</a
                >
              </li>
              <li>
                Add annotations with <a
                  href="https://seams.so/"
                  target="_blank"
                  rel="noopener noreferrer">Seams</a
                >
              </li>
            </ul>
          </div>
        </CollapsibleContainer>
      </div>
    {/if}
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

  .bluesky-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #495057;
    align-self: flex-start;
    margin-bottom: 4px;
  }

  .handle-input-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 400px;
    align-items: center;
  }

  .handle-input {
    width: 100%;
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
    min-width: 120px;
  }

  .auth-button.login:hover:not(:disabled),
  .auth-button.logout:hover {
    background-color: #0070e0;
  }

  .why-bluesky-wrapper {
    margin-top: 24px;
    width: 100%;
    max-width: 500px;
  }

  .why-bluesky-content {
    font-size: 14px;
    line-height: 1.6;
    color: #495057;
  }

  .why-bluesky-content p {
    margin: 0 0 12px 0;
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

  :global(body.dark-mode) .bluesky-info {
    color: #c1c2c5;
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

  :global(body.dark-mode) .why-bluesky-content {
    color: #c1c2c5;
  }
</style>
