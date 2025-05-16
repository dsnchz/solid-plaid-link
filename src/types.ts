export type PlaidAccountType = "depository" | "credit" | "loan" | "investment" | "other";

export type PlaidAccountVerificationStatus =
  | "pending_automatic_verification"
  | "pending_manual_verification"
  | "manually_verified"
  | "verification_expired"
  | "verification_failed"
  | "database_matched"
  | "database_insights_pending";

export type PlaidAccountTransferStatus = "COMPLETE" | "INCOMPLETE";

export type PlaidAccount = {
  /** The Plaid account_id */
  readonly id: string;
  /** The official account name */
  readonly name: string;
  /** The last 2-4 alphanumeric characters of an account's official account number. Note that the mask may be non-unique
   * between an Item's accounts. It may also not match the mask that the bank displays to the user. */
  readonly mask: string | null;
  readonly type: PlaidAccountType;
  readonly subtype: string;
  /** Indicates an Item's micro-deposit-based verification or database verification status. */
  readonly verification_status: PlaidAccountVerificationStatus | null;
  /** If micro-deposit verification is being used, indicates whether the account being verified is a business or personal
   * account. */
  readonly class_type: string | null;
};

export type PlaidInstitution = {
  readonly name: string;
  readonly institution_id: string;
};

/** See https://plaid.com/docs/link/web/#link-web-onexit-metadata for more details */
export type PlaidExitStatus =
  | "requires_questions"
  | "requires_selections"
  | "requires_code"
  | "choose_device"
  | "requires_credentials"
  | "requires_account_selection"
  | "requires_oauth"
  | "institution_not_found"
  | "institution_not_supported";

/**
 * Error object returned from Plaid Link.
 *
 * This object is passed to the `onExit` callback and contains information about the error that occurred.
 */
export type PlaidLinkError = {
  /** A broad categorization of the error. */
  readonly error_type: string;
  /** The particular error code. Each error_type has a specific set of error_codes. */
  readonly error_code: string;
  /** A developer-friendly representation of the error code. */
  readonly error_message: string;
  /** A user-friendly representation of the error code. null if the error is not related to user action. This may
   * change over time and is not safe for programmatic use. */
  readonly display_message: string | null;
};

/**
 * Metadata for the Plaid Link `onSuccess` callback.
 *
 * This object is passed to the `onSuccess` callback and contains information about the institution and accounts that were linked.
 */
export type PlaidLinkOnSuccessMetadata = {
  /** An institution object. If the Item was created via Same-Day micro-deposit verification, will be null. */
  readonly institution: PlaidInstitution | null;
  /** A list of accounts attached to the connected Item. If Account Select is enabled via the developer dashboard,
   * accounts will only include selected accounts */
  readonly accounts: PlaidAccount[];
  /** A unique identifier associated with a user's actions and events through the Link flow. Include this identifier when
   * opening a support ticket for faster turnaround. */
  readonly link_session_id: string;
  /** The status of a transfer. Returned only when Transfer UI is implemented. */
  readonly transfer_status: PlaidAccountTransferStatus | null;
};

/**
 * Metadata for the Plaid Link `onExit` callback.
 *
 * This object is passed to the `onExit` callback and contains information about the institution and status of the Link flow.
 */
export type PlaidLinkOnExitMetadata = {
  readonly institution: PlaidInstitution | null;
  // see possible values for status at https://plaid.com/docs/link/web/#link-web-onexit-status
  readonly status: PlaidExitStatus;
  /** A unique identifier associated with a user's actions and events through the Link flow. Include this identifier
   * when opening a support ticket for faster turnaround. */
  readonly link_session_id: string;
  /** The request ID for the last request made by Link. This can be shared with Plaid Support to expedite investigation. */
  readonly request_id: string;
};

/**
 * Metadata for the Plaid Link `onEvent` callback.
 *
 * This object is passed to the `onEvent` callback and contains information about the event that occurred.
 */
export type PlaidLinkOnEventMetadata = {
  /** The account number mask extracted from the user-provided account number. If the user-inputted account number is four
   * digits long, account_number_mask is empty. Emitted by `SUBMIT_ACCOUNT_NUMBER`. */
  readonly account_numbe_mask: string | null;
  /** The error type that the user encountered. Emitted by: `ERROR`, `EXIT`. */
  readonly error_type: string | null;
  /** The error code that the user encountered. Emitted by `ERROR`, `EXIT`. */
  readonly error_code: string | null;
  /** The error message that the user encountered. Emitted by: `ERROR`, `EXIT`. */
  readonly error_message: string | null;
  /** The status key indicates the point at which the user exited the Link flow. Emitted by: `EXIT` */
  readonly exit_status: string | null;
  /** The ID of the selected institution. Emitted by: all events. */
  readonly institution_id: string | null;
  /** The name of the selected institution. Emitted by: all events. */
  readonly institution_name: string | null;
  /** The query used to search for institutions. Emitted by: `SEARCH_INSTITUTION`. */
  readonly institution_search_query: string | null;
  /** Indicates if the current Link session is an update mode session. Emitted by: `OPEN`. */
  readonly is_update_mode: string | null;
  /** The reason this institution was matched. This will be either returning_user or routing_number if emitted by:
   * `MATCHED_SELECT_INSTITUTION`. Otherwise, this will be `SAVED_INSTITUTION` or `AUTO_SELECT_SAVED_INSTITUTION` if
   * emitted by: `SELECT_INSTITUTION`. */
  readonly match_reason: string | null;
  /** The routing number submitted by user at the micro-deposits routing number pane. Emitted by `SUBMIT_ROUTING_NUMBER`. */
  readonly routing_number: string | null;
  /** If set, the user has encountered one of the following `MFA` types: code, device, questions, selections. Emitted by:
   * `SUBMIT_MFA` and `TRANSITION_VIEW` when view_name is `MFA` */
  readonly mfa_type: string | null;
  /** The name of the view that is being transitioned to. Emitted by: `TRANSITION_VIEW`. See possible values at
   * https://plaid.com/docs/link/web/#link-web-onevent-metadata-view-name */
  readonly view_name: string | null;
  /** The request ID for the last request made by Link. This can be shared with Plaid Support to expedite investigation.
   * Emitted by: all events. */
  readonly request_id: string;
  /** The link_session_id is a unique identifier for a single session of Link. It's always available and will stay constant
   * throughout the flow. Emitted by: all events. */
  readonly link_session_id: string;
  /** An ISO 8601 representation of when the event occurred. For example `2017-09-14T14:42:19.350Z`. Emitted by: all events. */
  readonly timestamp: string;
  /** Either the verification method for a matched institution selected by the user or the Auth Type Select flow type
   * selected by the user. If selection is used to describe selected verification method, then possible values are
   * `phoneotp` or `password`;  if selection is used to describe the selected Auth Type Select flow, then possible values
   * are `flow_type_manual` or `flow_type_instant`. Emitted by: `MATCHED_SELECT_VERIFY_METHOD` and `SELECT_AUTH_TYPE`. */
  readonly selection: string | null;
};

/**
 * A stable set of known event names Plaid Link may emit.
 */
export type PlaidLinkStableEvent =
  | "OPEN"
  | "EXIT"
  | "HANDOFF"
  | "SELECT_INSTITUTION"
  | "ERROR"
  | "BANK_INCOME_INSIGHTS_COMPLETED"
  | "IDENTITY_VERIFICATION_PASS_SESSION"
  | "IDENTITY_VERIFICATION_FAIL_SESSION";

/**
 * The response from the `/link/token/create` endpoint.
 *
 * This object is returned by the `fetchToken` function and is used to initialize Plaid Link.
 */
export type PlaidCreateLinkToken = {
  /** Must be supplied to Link in order to initialize it and receive a public_token, which can be exchanged for an access_token. */
  readonly link_token: string;
  /** The expiration date for the link_token in ISO 8601 format (e.g. "2025-05-15T14:30:00Z") */
  readonly expiration: string;
  /** A unique identifier for the request, which can be used for troubleshooting. This identifier, like all Plaid identifiers, is case sensitive. */
  readonly request_id?: string;
};

/**
 * Function that returns a promise resolving to a `PlaidCreateLinkToken`.
 */
export type PlaidLinkTokenFetcher = () => Promise<PlaidCreateLinkToken>;

export type PlaidLinkOnEvent = (
  // see possible values for eventName at
  // https://plaid.com/docs/link/web/#link-web-onevent-eventName.
  // Events other than stable events are informational and subject to change,
  // and therefore should not be used to customize your product experience.
  eventName: PlaidLinkStableEvent | string,
  metadata: PlaidLinkOnEventMetadata,
) => void;

/**
 * Callback functions for Plaid Link events.
 *
 * These functions are passed to `createPlaidLink()` or `<PlaidEmbeddedLink />` and
 * define how the Plaid Link flow should behave in your app.
 */
export type PlaidCallbacks = {
  /** A function that is called when a user successfully links an Item. */
  readonly onSuccess: (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => void;
  /** A function that is called when a user exits Link without successfully linking an Item, or when an error occurs
   * during Link initialization. */
  readonly onExit?: (error: PlaidLinkError | null, metadata: PlaidLinkOnExitMetadata) => void;
  /** A function that is called when a user reaches certain points in the Link flow. See possible values for `eventName`
   * at https://plaid.com/docs/link/web/#link-web-onevent-eventName. Events other than stable events are informational and
   * subject to change and therefore should not be used to customize your product experience. */
  readonly onEvent?: (
    eventName: PlaidLinkStableEvent | string,
    metadata: PlaidLinkOnEventMetadata,
  ) => void;
  /** A function that is called when the Link module has finished loading. Calls to plaidLinkHandler.open() prior to the
   * `onLoad` callback will be delayed until the module is fully loaded. */
  readonly onLoad?: () => void;
};

/**
 * Options to control Plaid Link token caching behavior.
 * Used internally by `createPlaidLink` and `<PlaidEmbeddedLink />` when caching is enabled.
 */
export type CreatePlaidLinkCacheOptions = {
  /** Storage to use for caching. Defaults to sessionStorage. */
  readonly storage?: Storage;
  /** sessionStorage key to use (default: "plaid_link_token") */
  readonly storageKey?: string;
  /** Expiration buffer in milliseconds. If token expiration is within this buffer, the token will be refreshed. (default: 30000) */
  readonly bufferMs?: number;
};

/**
 * Configuration for initializing a Plaid Link instance.
 *
 * This object is passed to `createPlaidLink()` or `<PlaidEmbeddedLink />` and
 * defines how the Plaid Link flow should behave in your app.
 */
export type CreatePlaidLinkConfig = PlaidCallbacks & {
  /**
   * Fetcher to retrieve the `link_token` required to initialize Plaid Link. The server supporting your app should
   * create a link_token using the Plaid `/link/token/create` endpoint and return a `{ link_token, expiration }` object.
   *
   * See https://plaid.com/docs/api/link/#linktokencreate for more details.
   */
  readonly fetchToken: PlaidLinkTokenFetcher;
  /**
   * Optional redirect URI required when supporting OAuth flows.
   * Should be set to `window.location.href` when returning from an OAuth redirect.
   */
  readonly receivedRedirectUri?: string;
  /**
   * Whether to enable automatic caching of the link token in storage (default: `sessionStorage`).
   * If enabled, the token will be reused until it expires (with a buffer).
   *
   * @default true
   */
  readonly cache?: boolean;
  /**
   * Options to customize the token caching behavior.
   * Only relevant if `cache` is enabled (which it is by default).
   */
  readonly cacheOptions?: CreatePlaidLinkCacheOptions;
};

export type PlaidHandlerSubmissionData = {
  readonly phone_number: string | null;
};

type ExitOptions = {
  /** If `true`, Link will exit immediately. Otherwise an exit confirmation screen may be presented to the user. */
  readonly force?: boolean;
};

export type CreatePlaidLinkErrorKind =
  | "non_browser"
  | "script_load"
  | "token_fetch"
  | "local"
  | "plaid_unavailable"
  | "missing_token_data";

/**
 * Structured error returned from `createPlaidLink` or `<PlaidEmbeddedLink />`.
 */
export type CreatePlaidLinkError = {
  readonly kind: CreatePlaidLinkErrorKind;
  readonly message: string;
  readonly cause: Error;
};

export type PlaidHandler = {
  /** Display the Consent Pane view to your user, starting the Link flow.
   * Once open is called, you will begin receiving events via the `onEvent` callback. */
  readonly open: () => void;
  readonly submit: (data: PlaidHandlerSubmissionData) => void;
  /** Programmatically close Link. Calling this will trigger either the `onExit` or `onSuccess` callbacks. */
  readonly exit: (opts?: ExitOptions) => void;
  /** Destroy the Link handler instance, properly removing any DOM artifacts that were created by it. */
  readonly destroy: () => void;
};

export type PlaidLinkHandler = Omit<PlaidHandler, "destroy">;

export type PlaidEmbeddedHandler = {
  readonly destroy: () => void;
};

type PlaidCreateConfig = PlaidCallbacks & {
  // Provide a link_token associated with your account. Create one
  // using the /link/token/create endpoint.
  readonly token?: string | null;
  /** required on the second-initialization of link when using Link with a `redirect_uri` to support OAuth flows. */
  readonly receivedRedirectUri?: string;
};

export type Plaid = {
  readonly create: (config: PlaidCreateConfig) => PlaidHandler;
  readonly createEmbedded: (
    config: PlaidCreateConfig,
    domTarget: HTMLElement,
  ) => PlaidEmbeddedHandler;
};
