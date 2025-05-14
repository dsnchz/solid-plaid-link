import { tryCatch } from "@dschz/try-catch";

import { PLAID_LINK_DEFAULT_BUFFER_MS } from "../constants";
import { PLAID_LINK_DEFAULT_STORAGE } from "../constants";
import { PLAID_LINK_DEFAULT_STORAGE_KEY } from "../constants";
import type { PlaidCreateLinkToken, PlaidLinkTokenFetcher } from "../types";

const executeFetcher = async (fetchToken: PlaidLinkTokenFetcher): Promise<PlaidCreateLinkToken> => {
  const [fetchError, fresh] = await tryCatch(fetchToken());

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!fresh.link_token) {
    throw new Error("link_token missing from token fetch response.");
  }

  if (!fresh.expiration) {
    throw new Error("expiration missing from token fetch response.");
  }

  return fresh;
};

const fetchAndCache = async (
  fetchToken: PlaidLinkTokenFetcher,
  storage: Storage,
  storageKey: string,
): Promise<PlaidCreateLinkToken> => {
  const [fetchError, fresh] = await tryCatch(executeFetcher(fetchToken));

  if (fetchError) throw fetchError;

  await tryCatch(() => storage.setItem(storageKey, JSON.stringify(fresh)));

  return fresh;
};

type CreateCachedPlaidTokenFetcherOptions = {
  /** Storage to use for caching. Defaults to sessionStorage. */
  readonly storage?: Storage;
  /** sessionStorage key to use (default: "plaid_link_token") */
  readonly storageKey?: string;
  /** Expiration buffer in milliseconds. If token expiration is within this buffer, the token will be refreshed. (default: 30000) */
  readonly bufferMs?: number;
};

/**
 * Wraps a Plaid Link token fetcher with session-based caching logic.
 *
 * This utility stores the result of your `fetchToken` call in `sessionStorage`
 * and reuses it as long as the token is still valid. It is especially useful for
 * supporting Plaid’s OAuth redirect flow, where the user may return to your app
 * and need to re-initialize Link without generating a new token.
 *
 * ---
 * ✅ Intended to be used with `createPlaidLink` or `PlaidEmbeddedLink`.
 * Just pass the returned function directly to the `fetchToken` prop.
 *
 * ---
 * ⚠️ Token Expiration Notes:
 * - Tokens expire after **4 hours** (standard mode)
 * - Tokens expire after **30 minutes** (update mode)
 * Your backend must return a valid `expiration` ISO timestamp to enable correct cache reuse.
 *
 * ---
 * @param fetchToken An async function that returns `{ link_token, expiration }`
 * @param options
 * - `storageKey` – Optional key used in sessionStorage (default: `"solid_plaid_link_token"`)
 * - `bufferMs` – Time (in ms) before expiration to treat token as stale (default: `15000`)
 * - `storage` – Optional custom storage (defaults to `sessionStorage`)
 *
 * @returns A new fetcher function that reuses cached tokens if still valid.
 *
 * ---
 * @example With `PlaidEmbeddedLink`
 * ```tsx
 * const cachedFetch = createCachedPlaidTokenFetcher(() =>
 * fetch("/api/plaid/token").then(res => res.json())
 * );
 *
 * <PlaidEmbeddedLink fetchToken={cachedFetch} onSuccess={...} />
 * ```
 *
 * @example With `createPlaidLink`
 * ```tsx
 * const cachedFetch = createCachedPlaidTokenFetcher(() =>
 *   fetch("/api/plaid/token").then(res => res.json())
 * );
 *
 * const { ready, error, plaidLink } = createPlaidLink(() => ({
 *   fetchToken: cachedFetch,
 *   onSuccess: (token, meta) => console.log(token),
 * }));
 *
 * <button disabled={!ready()} onClick={() => plaidLink().open()}>
 *   Link your account
 * </button>
 * ```
 */
export const createCachedPlaidTokenFetcher = (
  fetchToken: PlaidLinkTokenFetcher,
  cache = true,
  options: CreateCachedPlaidTokenFetcherOptions = {},
): PlaidLinkTokenFetcher => {
  if (!cache) return () => executeFetcher(fetchToken);

  const {
    storage = PLAID_LINK_DEFAULT_STORAGE,
    storageKey = PLAID_LINK_DEFAULT_STORAGE_KEY,
    bufferMs = PLAID_LINK_DEFAULT_BUFFER_MS,
  } = options;

  return async () => {
    const [readError, raw] = await tryCatch(() => storage.getItem(storageKey));

    if (readError || !raw) return fetchAndCache(fetchToken, storage, storageKey);

    const [parseError, cached] = await tryCatch(() => JSON.parse(raw) as PlaidCreateLinkToken);

    if (parseError) return fetchAndCache(fetchToken, storage, storageKey);

    const expiresAt = Date.parse(cached.expiration);
    const now = Date.now();
    const isExpired = isNaN(expiresAt) || expiresAt - now <= bufferMs;

    if (!isExpired) return cached;

    await tryCatch(() => storage.removeItem(storageKey));
    return fetchAndCache(fetchToken, storage, storageKey);
  };
};
