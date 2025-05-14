import { createScript } from "@dschz/solid-create-script";
import {
  type Accessor,
  createEffect,
  createResource,
  createSignal,
  onCleanup,
  splitProps,
} from "solid-js";

import { PLAID_LINK_STABLE_URL } from "../constants";
import { PlaidScriptLoadError, PlaidTokenFetchError, PlaidUnavailableError } from "../errors";
import type { CreatePlaidLinkConfig, CreatePlaidLinkError, PlaidLinkHandler } from "../types";
import { createCachedPlaidTokenFetcher } from "../utils/createCachedPlaidTokenFetcher";
import { scheduleLinkTokenRefresh } from "../utils/scheduleLinkTokenRefresh";

const NOOP_PLAID_HANDLER: PlaidLinkHandler = {
  open: () => {
    console.warn("solid-plaid-link: Plaid Link is not ready yet. This is a no-op.");
  },
  exit: () => {},
  submit: () => {},
};

type PlaidLink = {
  /** Flag whether Plaid Link has successfully loaded or not */
  readonly ready: Accessor<boolean>;
  /** Possible error from either downloading Plaid script from CDN or error fetching link token */
  readonly error: Accessor<CreatePlaidLinkError | null>;
  /** The Plaid Link client */
  readonly plaidLink: Accessor<PlaidLinkHandler>;
  /** Manually fetch the link token */
  readonly refetchLinkToken: () => void;
};

/**
 * Creates and manages a Plaid Link instance in SolidJS.
 *
 * This hook handles loading the Plaid script, initializing the Link handler,
 * refreshing the token before it expires, and cleaning up the instance on unmount.
 *
 * Use this when you want **full control** over how and when to open the Plaid Link UI.
 *
 * ---
 * ✅ Built-in token caching (enabled by default) stores the link token in `sessionStorage`
 * and reuses it if still valid. You can disable or configure caching via props.
 *
 * 🔐 The `public_token` returned by Plaid Link must be exchanged on your server for an `access_token`.
 *
 * 📦 A new Plaid Link instance is created whenever the configuration changes.
 *
 * ---
 * @param config A `CreatePlaidLinkConfig` or a reactive accessor that returns it.
 * - Must include a `fetchToken()` method that returns `{ link_token, expiration }`.
 * - Optional `cache` (boolean, default: `true`) enables token reuse across reloads.
 * - Optional `cacheOptions` lets you customize storage behavior (e.g., `localStorage`, custom key, buffer time).
 *
 * @returns An object with:
 * - `ready()` – becomes `true` when Plaid Link is ready to open
 * - `error()` – any script or token-fetching error
 * - `plaidLink()` – the handler with `.open()` and `.exit()` methods
 * - `refetchLinkToken()` – manually refresh the token
 *
 * ---
 * @example
 * ```tsx
 * const { ready, error, plaidLink } = createPlaidLink(() => ({
 *   fetchToken: () =>
 *     fetch("/api/create-link-token").then((r) => r.json()),
 *   onSuccess: (token, meta) => { ... },
 *   cache: true, // optional (enabled by default)
 * }));
 *
 * <button disabled={!ready()} onClick={() => plaidLink().open()}>
 *   Connect Account
 * </button>
 * ```
 */
export const createPlaidLink = (
  config: CreatePlaidLinkConfig | Accessor<CreatePlaidLinkConfig>,
): PlaidLink => {
  const script = createScript(PLAID_LINK_STABLE_URL);

  const props = () => (typeof config === "function" ? config() : config);

  const [local, plaidConfig] = splitProps(props(), [
    "onLoad",
    "fetchToken",
    "cache",
    "cacheOptions",
  ]);

  const tokenFetcher = () =>
    createCachedPlaidTokenFetcher(local.fetchToken, local.cache, local.cacheOptions)();

  const [tokenRequest, { refetch }] = createResource(tokenFetcher);

  const [plaidLink, setPlaidLink] = createSignal(NOOP_PLAID_HANDLER);
  const [ready, setReady] = createSignal(false);

  const error: Accessor<CreatePlaidLinkError | null> = () => {
    if (script.loading || tokenRequest.loading) return null;

    if (script.error) {
      return {
        kind: "script_load",
        message: `PlaidScriptLoadError: ${script.error.message}`,
        cause: new PlaidScriptLoadError(script.error.message),
      };
    }

    if (!window.Plaid) {
      return {
        kind: "plaid_unavailable",
        message: "PlaidUnavailableError: Plaid is not available in the global window object.",
        cause: new PlaidUnavailableError(),
      };
    }

    if (tokenRequest.state === "errored") {
      return {
        kind: "token_fetch",
        message: `PlaidTokenFetchError: ${tokenRequest.error.message}`,
        cause: new PlaidTokenFetchError(tokenRequest.error.message),
      };
    }

    return null;
  };

  createEffect(() => {
    setReady(false);

    if (script.loading || tokenRequest.loading || script.error || !window.Plaid) return;
    if (tokenRequest.state === "unresolved" || tokenRequest.state === "errored") return;

    const { link_token, expiration } = tokenRequest();

    const plaidHandler = window.Plaid.create({
      ...plaidConfig,
      token: link_token,
      onLoad: () => {
        setReady(true);
        local.onLoad?.();
      },
    });

    setPlaidLink(plaidHandler);

    const timerId = scheduleLinkTokenRefresh(refetch, expiration);

    onCleanup(() => {
      plaidHandler.exit({ force: true });
      plaidHandler.destroy();

      setPlaidLink(NOOP_PLAID_HANDLER);
      setReady(false);

      clearTimeout(timerId);
    });
  });

  return {
    refetchLinkToken: refetch,
    ready,
    error,
    plaidLink,
  };
};
