export class PlaidScriptLoadError extends Error {
  constructor(message: string) {
    super(`PlaidScriptLoadError: ${message}`);
    this.name = "PlaidScriptLoadError";
  }
}

export class PlaidUnavailableError extends Error {
  constructor() {
    super("PlaidUnavailableError: Plaid is not available in the global window object.");
    this.name = "PlaidUnavailableError";
  }
}

export class PlaidTokenFetchError extends Error {
  constructor(message: string) {
    super(`PlaidTokenFetchError: ${message}`);
    this.name = "PlaidTokenFetchError";
  }
}
