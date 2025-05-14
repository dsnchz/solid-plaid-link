import { createScript } from "@dschz/solid-create-script";
import { render, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, type MockedFunction, test, vi } from "vitest";

import { PlaidScriptLoadError, PlaidTokenFetchError, PlaidUnavailableError } from "../../errors";
import {
  createFakeResource,
  createMockStorage,
  getFuturePlaidExpiration,
  sleep,
} from "../../testUtils";
import type { Plaid } from "../../types";
import { PlaidEmbeddedLink } from "../PlaidEmbeddedLink";

vi.mock("@dschz/solid-create-script");
const mockCreateScript = createScript as MockedFunction<typeof createScript>;

const TEST_TOKEN = "test-token";

describe("COMPONENT: <PlaidEmbeddedLink />", () => {
  let createEmbeddedSpy: MockedFunction<Plaid["createEmbedded"]>;
  let destroySpy: MockedFunction<() => void>;

  beforeEach(() => {
    destroySpy = vi.fn();

    createEmbeddedSpy = vi.fn((_config, _target) => {
      _config.onLoad?.();

      return {
        destroy: destroySpy,
      };
    });

    window.Plaid = {
      createEmbedded: createEmbeddedSpy,
      create: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("does not create embedded Plaid instance when script is still loading", async () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: true,
        state: "pending",
      }),
    );

    render(() => (
      <PlaidEmbeddedLink
        fetchToken={() =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() })
        }
        onSuccess={vi.fn()}
        cacheOptions={{
          storage: mockStorage,
        }}
      />
    ));

    await sleep(2);

    expect(createEmbeddedSpy).toHaveBeenCalledTimes(0);
  });

  test("does not create embedded Plaid instance when script errors", async () => {
    const mockStorage = createMockStorage();

    const onErrorSpy = vi.fn();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "errored",
        error: new Error("SCRIPT_LOAD_ERROR"),
      }),
    );

    render(() => (
      <PlaidEmbeddedLink
        fetchToken={() =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() })
        }
        onSuccess={vi.fn()}
        onError={onErrorSpy}
        cacheOptions={{
          storage: mockStorage,
        }}
      />
    ));

    await waitFor(() => expect(onErrorSpy).toHaveBeenCalledTimes(1));

    expect(onErrorSpy).toHaveBeenCalledWith({
      kind: "script_load",
      message: "PlaidScriptLoadError: SCRIPT_LOAD_ERROR",
      cause: new PlaidScriptLoadError("SCRIPT_LOAD_ERROR"),
    });

    expect(createEmbeddedSpy).toHaveBeenCalledTimes(0);
  });

  test("does not create embedded Plaid instance when token missing", async () => {
    const mockStorage = createMockStorage();
    const onErrorSpy = vi.fn();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    render(() => (
      <PlaidEmbeddedLink
        fetchToken={() =>
          Promise.resolve({ link_token: "", expiration: getFuturePlaidExpiration() })
        }
        onSuccess={vi.fn()}
        onError={onErrorSpy}
        cacheOptions={{
          storage: mockStorage,
        }}
      />
    ));

    await waitFor(() => expect(onErrorSpy).toHaveBeenCalledTimes(1));

    expect(onErrorSpy).toHaveBeenCalledWith({
      kind: "token_fetch",
      message: "PlaidTokenFetchError: link_token missing from token fetch response.",
      cause: new PlaidTokenFetchError("link_token missing from token fetch response."),
    });

    expect(createEmbeddedSpy).toHaveBeenCalledTimes(0);
  });

  test("does not create embedded Plaid instance when expiration missing", async () => {
    const mockStorage = createMockStorage();

    const onErrorSpy = vi.fn();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    render(() => (
      <PlaidEmbeddedLink
        fetchToken={() => Promise.resolve({ link_token: "test-token", expiration: "" })}
        onSuccess={vi.fn()}
        onError={onErrorSpy}
        cacheOptions={{
          storage: mockStorage,
        }}
      />
    ));

    await waitFor(() => expect(onErrorSpy).toHaveBeenCalledTimes(1));

    expect(onErrorSpy).toHaveBeenCalledWith({
      kind: "token_fetch",
      message: "PlaidTokenFetchError: expiration missing from token fetch response.",
      cause: new PlaidTokenFetchError("expiration missing from token fetch response."),
    });

    expect(createEmbeddedSpy).toHaveBeenCalledTimes(0);
  });

  test("does not create embedded Plaid instance when Plaid is not available in global window", async () => {
    const mockStorage = createMockStorage();
    // @ts-expect-error - This is a test
    window.Plaid = undefined;

    const onErrorSpy = vi.fn();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    render(() => (
      <PlaidEmbeddedLink
        fetchToken={() => Promise.resolve({ link_token: TEST_TOKEN, expiration: "" })}
        onSuccess={vi.fn()}
        onError={onErrorSpy}
        cacheOptions={{
          storage: mockStorage,
        }}
      />
    ));

    expect(createEmbeddedSpy).toHaveBeenCalledTimes(0);

    await waitFor(() =>
      expect(onErrorSpy).toHaveBeenCalledWith({
        kind: "plaid_unavailable",
        message: "PlaidUnavailableError: Plaid is not available in the global window object.",
        cause: new PlaidUnavailableError(),
      }),
    );
  });

  test("does not create embedded Plaid instance when token fetch errors", async () => {
    const mockStorage = createMockStorage();
    const onErrorSpy = vi.fn();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    render(() => (
      <PlaidEmbeddedLink
        fetchToken={() => Promise.reject(new Error("TOKEN_FETCH_ERROR"))}
        onSuccess={vi.fn()}
        onError={onErrorSpy}
        cacheOptions={{
          storage: mockStorage,
        }}
      />
    ));

    expect(createEmbeddedSpy).toHaveBeenCalledTimes(0);

    await waitFor(() =>
      expect(onErrorSpy).toHaveBeenCalledWith({
        kind: "token_fetch",
        message: "PlaidTokenFetchError: TOKEN_FETCH_ERROR",
        cause: new PlaidTokenFetchError("TOKEN_FETCH_ERROR"),
      }),
    );
  });

  test("creates embedded instance when all conditions are met", async () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    render(() => (
      <PlaidEmbeddedLink
        fetchToken={() =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() })
        }
        onSuccess={vi.fn()}
        cacheOptions={{
          storage: mockStorage,
        }}
      />
    ));

    await waitFor(() => expect(createEmbeddedSpy).toHaveBeenCalledTimes(1));
  });

  test("recreates embedded Plaid instance when config changes", async () => {
    const mockStorage = createMockStorage();

    const onSuccessSpy = vi.fn();
    const onSuccessSpy2 = vi.fn();

    mockCreateScript.mockImplementation(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    const [onSuccess, setOnSuccess] = createSignal(onSuccessSpy);

    render(() => (
      <PlaidEmbeddedLink
        onSuccess={onSuccess()}
        fetchToken={() =>
          Promise.resolve({
            link_token: TEST_TOKEN,
            expiration: getFuturePlaidExpiration(),
          })
        }
        cacheOptions={{
          storage: mockStorage,
        }}
      />
    ));

    await waitFor(() => expect(createEmbeddedSpy).toHaveBeenCalledTimes(1));

    setOnSuccess(onSuccessSpy2);

    await waitFor(() => expect(createEmbeddedSpy).toHaveBeenCalledTimes(2), { timeout: 2000 });
  });

  test("does not recreate embedded instance if Plaid config did not change", async () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    const [style, setStyle] = createSignal({ backgroundColor: "red" });

    render(() => (
      <PlaidEmbeddedLink
        fetchToken={() =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() })
        }
        onSuccess={vi.fn()}
        style={style()}
        cacheOptions={{
          storage: mockStorage,
        }}
      />
    ));

    await waitFor(() => expect(createEmbeddedSpy).toHaveBeenCalledTimes(1));

    setStyle({ backgroundColor: "blue" });

    await waitFor(() => expect(createEmbeddedSpy).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });
});
