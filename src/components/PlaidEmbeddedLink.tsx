import { createScript } from "@dschz/solid-create-script";
import {
  type Accessor,
  createEffect,
  createResource,
  type JSX,
  onCleanup,
  splitProps,
} from "solid-js";

import { PLAID_LINK_PROPS, PLAID_LINK_STABLE_URL } from "../constants";
import { PlaidTokenFetchError, PlaidUnavailableError } from "../errors";
import { PlaidScriptLoadError } from "../errors";
import type { CreatePlaidLinkConfig, CreatePlaidLinkError } from "../types";
import { createCachedPlaidTokenFetcher } from "../utils/createCachedPlaidTokenFetcher";
import { scheduleLinkTokenRefresh } from "../utils/scheduleLinkTokenRefresh";

export type PlaidEmbeddedLinkProps = CreatePlaidLinkConfig &
  Omit<JSX.HTMLAttributes<HTMLDivElement>, "onError" | "onerror" | "on:error"> & {
    readonly onError?: (error: CreatePlaidLinkError) => void;
  };

/**
 * Renders the embedded Plaid Link UI using a `<div>` container.
 *
 * Unlike the standard Plaid Link flow (which opens a modal), this component uses
 * `Plaid.createEmbedded(...)` to inject the Link experience directly into the DOM.
 *
 * ---
 * ✅ Use this when:
 * - You want the Plaid Link UI mounted directly into your layout
 * - You’re integrating with institutions that require OAuth authentication
 *
 * ---
 * @prop fetchToken A function that returns `{ link_token, expiration }`
 * @prop onError Optional handler called when a script or token load error occurs
 * @prop ... All other standard Plaid Link configuration props (e.g. `onSuccess`, `onExit`)
 *
 * ---
 * @example
 * ```tsx
 * <PlaidEmbeddedLink
 *   fetchToken={() => fetch("/api/plaid/token").then(res => res.json())}
 *   onSuccess={(token, metadata) => console.log(token)}
 * />
 * ```
 *
 * @example OAuth redirect resume:
 * ```tsx
 * const isOAuth = window.location.search.includes("oauth_state_id");
 *
 * <PlaidEmbeddedLink
 *   fetchToken={() => getToken()}
 *   receivedRedirectUri={isOAuth ? window.location.href : undefined}
 * />
 * ```
 */
export const PlaidEmbeddedLink = (props: PlaidEmbeddedLinkProps): JSX.Element => {
  let container!: HTMLDivElement;
  const script = createScript(PLAID_LINK_STABLE_URL);

  const [local, rest] = splitProps(props, ["onError", "fetchToken", "cache", "cacheOptions"]);

  const [plaidConfig, containerProps] = splitProps(
    rest,
    PLAID_LINK_PROPS.filter((prop) => prop !== "fetchToken"),
  );

  const tokenFetcher = () =>
    createCachedPlaidTokenFetcher(local.fetchToken, local.cache, local.cacheOptions)();

  const [tokenRequest, { refetch }] = createResource(tokenFetcher);

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
    const e = error();
    if (!e) return;
    local.onError?.(e);
  });

  createEffect(() => {
    if (script.loading || tokenRequest.loading || !window.Plaid || script.error) return;
    if (tokenRequest.state === "unresolved" || tokenRequest.state === "errored") return;

    const { link_token, expiration } = tokenRequest();

    // The embedded Link interface doesn't use the `createPlaidLink` hook to manage
    // its Plaid Link instance because the embedded Link integration in link-initialize
    // maintains its own handler internally.
    const { destroy } = window.Plaid.createEmbedded(
      { ...plaidConfig, token: link_token },
      container,
    );

    const timerId = scheduleLinkTokenRefresh(refetch, expiration);

    onCleanup(() => {
      clearTimeout(timerId);
      destroy();
    });
  });

  return <div ref={container} {...containerProps} />;
};
