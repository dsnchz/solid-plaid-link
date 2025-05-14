import type { CreatePlaidLinkCacheOptions } from "./types";

export const PLAID_LINK_STABLE_URL = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

export const PLAID_LINK_PROPS = [
  "fetchToken",
  "onEvent",
  "onExit",
  "onLoad",
  "onSuccess",
  "receivedRedirectUri",
] as const;

export const PLAID_LINK_DEFAULT_STORAGE = sessionStorage;

export const PLAID_LINK_DEFAULT_STORAGE_KEY = "solid_plaid_link_token";

export const PLAID_LINK_DEFAULT_BUFFER_MS = 30_000;

export const PLAID_LINK_DEFAULT_CACHE_OPTIONS: CreatePlaidLinkCacheOptions = {
  storage: PLAID_LINK_DEFAULT_STORAGE,
  storageKey: PLAID_LINK_DEFAULT_STORAGE_KEY,
  bufferMs: PLAID_LINK_DEFAULT_BUFFER_MS,
};
