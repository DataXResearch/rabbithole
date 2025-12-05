<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { Client } from "@atcute/client";
  import type { At } from "@atcute/client";
  import { isHandle } from "@atcute/lexicons/syntax";
  import {
    configureOAuth,
    createAuthorizationUrl,
    defaultIdentityResolver,
    finalizeAuthorization,
    getSession,
    OAuthUserAgent,
    type Session,
  } from "@atcute/oauth-browser-client";
  import { Button, TextInput, Text, Loader, ActionIcon } from "@svelteuidev/core";
  import { Enter, Person } from "radix-icons-svelte";

  type Did = At.DID;

  // Create a custom identity resolver
  const identityResolver = {
    async resolve(identity: string) {
      // If it's already a DID, return the identity info
      if (identity.startsWith('did:')) {
        try {
          let didDocument;
          if (identity.startsWith("did:plc:")) {
            const res = await fetch(`https://plc.directory/${identity}`);
            if (res.ok) {
              didDocument = await res.json();
            }
          }

          return {
            identity,
            pds: didDocument?.service?.find((s: any) => s.type === 'AtprotoPersonalDataServer')?.serviceEndpoint || 'https://bsky.social'
          };
        } catch {
          return { identity, pds: 'https://bsky.social' };
        }
      }

      // If it's a handle, resolve it to a DID first
      try {
        const res = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${identity}`);
        if (!res.ok) throw new Error('Handle resolution failed');
        const data = await res.json();
        const did = data.did;

        // Get PDS from DID document
        let pds = 'https://bsky.social';
        try {
          if (did.startsWith("did:plc:")) {
            const docRes = await fetch(`https://plc.directory/${did}`);
            if (docRes.ok) {
              const didDoc = await docRes.json();
              pds = didDoc?.service?.find((s: any) => s.type === 'AtprotoPersonalDataServer')?.serviceEndpoint || 'https://bsky.social';
            }
          }
        } catch {
          // Use default PDS
        }

        return { identity: did, pds };
      } catch (err) {
        throw new Error(`Failed to resolve identity: ${identity}`);
      }
    }
  };

  // Configure OAuth
  configureOAuth({
    metadata: {
      client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_OAUTH_REDIRECT_URL,
    },
    identityResolver,
  });

  export let agent: OAuthUserAgent | undefined = undefined;

  let loginInput = "";
  let notice = "";
  let isLoading = false;
  let handle = "";

  const dispatch = createEventDispatcher();

  onMount(async () => {
    await retrieveSession();
  });

  // Helper to check if string is a DID
  function isDid(str: string): str is Did {
    return str.startsWith('did:');
  }

  async function login() {
    if (!loginInput) return;
    try {
      notice = "";
      isLoading = true;
      notice = "Contacting your data server...";

      const authUrl = await createAuthorizationUrl({
        scope: import.meta.env.VITE_OAUTH_SCOPE || "atproto transition:generic",
        target:
          isHandle(loginInput) || isDid(loginInput) ?
            { type: "account", identifier: loginInput }
          : { type: "pds", serviceUrl: loginInput },
      });

      notice = "Redirecting...";
      await new Promise((resolve) => setTimeout(resolve, 250));

      location.assign(authUrl);
    } catch (e) {
      console.error(e);
      notice = `${e}`;
      isLoading = false;
    }
  }

  async function retrieveSession() {
    // Check for OAuth callback in hash
    const params = new URLSearchParams(location.hash.slice(1));

    if (params.has("state") && (params.has("code") || params.has("error"))) {
      history.replaceState(null, "", location.pathname + location.search);

      try {
        const auth = await finalizeAuthorization(params);
        const did = auth.session.info.sub;

        localStorage.setItem("lastSignedIn", did);
        updateSessions(did, true);

        agent = new OAuthUserAgent(auth.session);

        // Fetch handle
        try {
            const rpc = new Client({ handler: agent });
            const res = await rpc.get("com.atproto.server.getSession");
            if (res.ok) {
                handle = res.data.handle;
            }
        } catch (e) {
            console.error("Failed to fetch session info", e);
        }

        dispatch("login", { agent, session: auth.session });
      } catch (err) {
        notice = `Error: ${err}`;
      }
    } else {
      // Try to restore session
      const lastSignedIn = localStorage.getItem("lastSignedIn");
      if (lastSignedIn && isDid(lastSignedIn)) {
        try {
          const session = await getSession(lastSignedIn);
          const rpc = new Client({ handler: new OAuthUserAgent(session) });
          const res = await rpc.get("com.atproto.server.getSession");

          if (!res.ok) throw res.data.error;

          handle = res.data.handle;
          updateSessions(lastSignedIn, true);
          agent = new OAuthUserAgent(session);
          dispatch("login", { agent, session });
        } catch (err) {
          updateSessions(lastSignedIn, false);
          console.error("Failed to restore session", err);
        }
      }
    }
  }

  function updateSessions(did: string, signedIn: boolean) {
    const sessionsStr = localStorage.getItem("sessions");
    const sessions = sessionsStr ? JSON.parse(sessionsStr) : {};
    if (!sessions[did]) sessions[did] = {};
    sessions[did].signedIn = signedIn;
    localStorage.setItem("sessions", JSON.stringify(sessions));
  }

  function signOut() {
    agent = undefined;
    handle = "";
    localStorage.removeItem("lastSignedIn");
    dispatch("logout");
  }
</script>

<div class="auth-container">
  {#if !agent}
    <form on:submit|preventDefault={login} class="login-form">
      <TextInput
        placeholder="user.bsky.social"
        icon={Person}
        bind:value={loginInput}
        disabled={isLoading}
        rightSectionWidth={42}
        radius="md"
        size="sm"
        class="auth-input"
      >
        <div slot="rightSection" style="display: flex; align-items: center; justify-content: center; height: 100%;">
            {#if isLoading}
                <Loader size="xs" />
            {:else}
                <ActionIcon
                    variant="transparent"
                    size="sm"
                    on:click={login}
                    disabled={!loginInput}
                >
                    <Enter />
                </ActionIcon>
            {/if}
        </div>
      </TextInput>
      {#if notice}
        <Text size="xs" color="dimmed" align="center" style="margin-top: 4px;">
          {notice}
        </Text>
      {/if}
    </form>
  {:else}
    <div class="logged-in">
        <div class="user-info">
            <Text size="sm" weight="bold" color="dimmed">Signed in as</Text>
            <Text size="sm" weight="bold">@{handle || 'User'}</Text>
        </div>
        <Button variant="subtle" size="xs" compact color="red" on:click={signOut}>
            Sign out
        </Button>
    </div>
  {/if}
</div>

<style>
  .auth-container {
    width: 100%;
  }
  .login-form {
    display: flex;
    flex-direction: column;
  }
  .logged-in {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
  }
  .user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
  }

  /* Center text in input */
  :global(.auth-input input) {
    text-align: center !important;
  }
</style>
