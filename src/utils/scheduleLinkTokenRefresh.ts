/**
 * Schedules a refresh of the Plaid Link token shortly before it expires.
 *
 * This utility sets a `setTimeout` to call your `refetch` function a short time
 * before the given expiration timestamp. The default behavior is to refresh
 * 15 seconds before the token expires.
 *
 * This is useful when using `createPlaidLink` or `PlaidEmbeddedLink` so that
 * a new token is automatically fetched without manual intervention.
 *
 * ---
 * @param refetch A function to call when it's time to refresh the token
 * @param expiration ISO 8601 string representing when the token expires
 * @param bufferMs Optional number of milliseconds to subtract from the expiration time (default: 15000)
 *
 * @returns The timer ID from `setTimeout` — be sure to call `clearTimeout()` in `onCleanup()` to prevent leaks
 */
export const scheduleLinkTokenRefresh = (
  refetch: () => void,
  expiration: string,
  bufferMs = 30_000,
) => {
  const now = Date.now();
  const linkTokenExpiration = Date.parse(expiration);
  const refreshTime = linkTokenExpiration - now - bufferMs;

  return setTimeout(refetch, refreshTime);
};
