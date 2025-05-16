import { createScript } from "@dschz/solid-create-script";
import { waitFor } from "@solidjs/testing-library";
import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, type MockedFunction, test, vi } from "vitest";

import { createFakeResource, createMockStorage, getFuturePlaidExpiration } from "../../testUtils";
import type { Plaid, PlaidHandler } from "../../types";
import { createPlaidLink } from "../createPlaidLink";

vi.mock("@dschz/solid-create-script");
const mockCreateScript = createScript as MockedFunction<typeof createScript>;

const TEST_TOKEN = "test-token";

describe("HOOK: createPlaidLink", () => {
  let mockPlaidHandler: PlaidHandler;

  beforeEach(() => {
    mockPlaidHandler = {
      open: vi.fn(),
      submit: vi.fn(),
      exit: vi.fn(),
      destroy: vi.fn(),
    };

    Object.defineProperty(window, "Plaid", {
      value: {
        createEmbedded: vi.fn(),
        create: ({ onLoad }) => {
          onLoad?.();
          return mockPlaidHandler;
        },
      } as Plaid,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("provides no-op Plaid Link client when not ready", () => {
    const mockStorage = createMockStorage();
    const consoleSpy = vi.spyOn(console, "warn").mockImplementationOnce(() => {});

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: true,
        state: "pending",
      }),
    );

    createRoot((dispose) => {
      const { plaidLink } = createPlaidLink(() => ({
        fetchToken: () =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() }),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      }));

      plaidLink().open();
      expect(mockPlaidHandler.open).not.toHaveBeenCalled();

      waitFor(() =>
        expect(consoleSpy).toHaveBeenCalledWith(
          "solid-plaid-link: Plaid Link is not ready yet. This is a no-op.",
        ),
      );

      plaidLink().exit();
      expect(mockPlaidHandler.exit).not.toHaveBeenCalled();

      plaidLink().submit({ phone_number: "" });
      expect(mockPlaidHandler.submit).not.toHaveBeenCalled();

      dispose();
    });
  });

  test("can invoke interface with or without config function", () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementation(() =>
      createFakeResource({
        loading: true,
        state: "pending",
      }),
    );

    createRoot((dispose) => {
      const { ready, error } = createPlaidLink({
        fetchToken: () =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() }),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      });

      expect(ready()).toEqual(false);
      expect(error()).toEqual(null);

      const { ready: ready2, error: error2 } = createPlaidLink(() => ({
        fetchToken: () =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() }),
        onSuccess: vi.fn(),
      }));

      expect(ready2()).toEqual(false);
      expect(error2()).toEqual(null);

      dispose();
    });
  });

  test("is not ready when script is loading", () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: true,
        state: "pending",
      }),
    );

    createRoot((dispose) => {
      const { ready, error } = createPlaidLink(() => ({
        fetchToken: () =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() }),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      }));

      expect(ready()).toEqual(false);
      expect(error()).toEqual(null);

      dispose();
    });
  });

  test("is not ready when script fails to load", async () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "errored",
        error: new Error("SCRIPT_LOAD_ERROR"),
      }),
    );

    await createRoot(async (dispose) => {
      const { ready, error } = createPlaidLink({
        fetchToken: () =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() }),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      });

      expect(ready()).toEqual(false);

      await waitFor(() => expect(error()?.kind).toEqual("script_load"));

      dispose();
    });
  });

  test("is not ready when fetchToken request is loading", () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    createRoot((dispose) => {
      const { ready } = createPlaidLink(() => ({
        fetchToken: () => Promise.resolve({ link_token: TEST_TOKEN, expiration: "" }),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      }));

      expect(ready()).toEqual(false);

      dispose();
    });
  });

  test("is not ready when Plaid is not available in global window", async () => {
    const mockStorage = createMockStorage();

    // @ts-expect-error - nulling out Plaid in window
    window.Plaid = undefined;

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    await createRoot(async (dispose) => {
      const { ready, error } = createPlaidLink({
        fetchToken: () =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() }),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      });

      expect(ready()).toEqual(false);

      await waitFor(() => expect(error()?.kind).toEqual("plaid_unavailable"));

      dispose();
    });
  });

  test("is not ready when fetchToken request fails", async () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    await createRoot(async (dispose) => {
      const { ready, error } = createPlaidLink({
        fetchToken: () => Promise.reject(new Error("FETCH_TOKEN_ERROR")),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      });

      expect(ready()).toEqual(false);

      await waitFor(() => expect(error()?.kind).toEqual("token_fetch"));

      dispose();
    });
  });

  test("is not ready when fetchToken request fails to return a link token", async () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    await createRoot(async (dispose) => {
      const { ready, error } = createPlaidLink({
        fetchToken: () =>
          Promise.resolve({ link_token: "", expiration: getFuturePlaidExpiration() }),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      });

      expect(ready()).toEqual(false);

      await waitFor(() => expect(error()?.kind).toEqual("token_fetch"));
      expect(error()?.message).toEqual(
        "PlaidTokenFetchError: link_token missing from token fetch response.",
      );

      dispose();
    });
  });

  test("is not ready when fetchToken request fails to return a link token expiration", async () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    await createRoot(async (dispose) => {
      const { ready, error } = createPlaidLink({
        fetchToken: () => Promise.resolve({ link_token: TEST_TOKEN, expiration: "" }),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      });

      expect(ready()).toEqual(false);

      await waitFor(() => expect(error()?.kind).toEqual("token_fetch"));
      expect(error()?.message).toEqual(
        "PlaidTokenFetchError: expiration missing from token fetch response.",
      );

      dispose();
    });
  });

  test("creates Plaid Link handler when script is ready and link token received", async () => {
    vi.setSystemTime(new Date(2024, 10, 24).getTime());

    const setTimeoutMock = vi.spyOn(global, "setTimeout").mockImplementation(() => {
      return 1234 as unknown as NodeJS.Timeout;
    });

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({
        loading: false,
        state: "ready",
      }),
    );

    await createRoot(async (dispose) => {
      const { ready, plaidLink, error } = createPlaidLink(() => ({
        fetchToken: () =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() }),
        onSuccess: vi.fn(),
      }));

      await waitFor(() => expect(ready()).toEqual(true));

      plaidLink().open();
      expect(mockPlaidHandler.open).toHaveBeenCalled();

      plaidLink().exit();
      expect(mockPlaidHandler.exit).toHaveBeenCalled();

      plaidLink().submit({ phone_number: "" });
      expect(mockPlaidHandler.submit).toHaveBeenCalled();

      expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));

      expect(error()).toEqual(null);

      dispose();
    });
  });

  test("uses cached token by default when cache is true", async () => {
    const mockStorage = createMockStorage();

    mockStorage.getItem.mockReturnValue(
      JSON.stringify({
        link_token: TEST_TOKEN,
        expiration: getFuturePlaidExpiration(),
      }),
    );

    const fetchToken = vi.fn().mockResolvedValue({
      link_token: TEST_TOKEN,
      expiration: getFuturePlaidExpiration(),
    });

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({ loading: false, state: "ready" }),
    );

    await createRoot(async (dispose) => {
      createPlaidLink(() => ({
        fetchToken,
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
        },
      }));

      await waitFor(() => expect(fetchToken).toHaveBeenCalledTimes(0));

      dispose();
    });
  });

  test("skips cache when `cache` is false", async () => {
    const fetchToken = vi.fn().mockResolvedValue({
      link_token: TEST_TOKEN,
      expiration: getFuturePlaidExpiration(),
    });

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({ loading: false, state: "ready" }),
    );

    await createRoot(async (dispose) => {
      createPlaidLink(() => ({
        fetchToken,
        onSuccess: vi.fn(),
        cache: false,
      }));

      await waitFor(() => expect(fetchToken).toHaveBeenCalledTimes(1));

      dispose();
    });
  });

  test("respects custom storage key when cacheOptions are provided", async () => {
    const mockStorage = createMockStorage();

    mockCreateScript.mockImplementationOnce(() =>
      createFakeResource({ loading: false, state: "ready" }),
    );

    await createRoot(async (dispose) => {
      createPlaidLink(() => ({
        fetchToken: () =>
          Promise.resolve({ link_token: TEST_TOKEN, expiration: getFuturePlaidExpiration() }),
        onSuccess: vi.fn(),
        cacheOptions: {
          storage: mockStorage,
          storageKey: "my_test_token",
          bufferMs: 10_000,
        },
      }));

      await waitFor(
        () => {
          expect(mockStorage.setItem).toHaveBeenCalledWith(
            "my_test_token",
            expect.stringContaining(TEST_TOKEN),
          );
        },
        { timeout: 3000 },
      );

      dispose();
    });
  });

  test("falls back when cached token is malformed", async () => {
    const mockStorage = createMockStorage();
    mockStorage.getItem.mockReturnValueOnce("{invalid json");

    const fetchToken = vi.fn().mockResolvedValue({
      link_token: TEST_TOKEN,
      expiration: getFuturePlaidExpiration(),
    });

    mockCreateScript.mockImplementation(() =>
      createFakeResource({ loading: false, state: "ready" }),
    );

    await createRoot(async (dispose) => {
      createPlaidLink(() => ({
        fetchToken,
        onSuccess: vi.fn(),
        cache: true,
        cacheOptions: { storage: mockStorage },
      }));

      await waitFor(() => expect(fetchToken).toHaveBeenCalledTimes(1));

      dispose();
    });
  });

  test("removes expired token from storage and fetches new one", async () => {
    const expiredToken = {
      link_token: TEST_TOKEN,
      expiration: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago
    };

    const mockStorage = createMockStorage();
    mockStorage.getItem.mockReturnValueOnce(JSON.stringify(expiredToken));

    const fetchToken = vi.fn().mockResolvedValue({
      link_token: TEST_TOKEN,
      expiration: getFuturePlaidExpiration(),
    });

    mockCreateScript.mockImplementation(() =>
      createFakeResource({ loading: false, state: "ready" }),
    );

    await createRoot(async (dispose) => {
      createPlaidLink(() => ({
        fetchToken,
        onSuccess: vi.fn(),
        cache: true,
        cacheOptions: { storage: mockStorage },
      }));

      await waitFor(() => {
        expect(mockStorage.removeItem).toHaveBeenCalled();
        expect(fetchToken).toHaveBeenCalledTimes(1);
      });

      dispose();
    });
  });

  test("can use localStorage", async () => {
    const storageKey = "plaid_test_local";
    const token = {
      link_token: TEST_TOKEN,
      expiration: getFuturePlaidExpiration(),
    };

    // Pre-seed localStorage with valid token
    localStorage.setItem(storageKey, JSON.stringify(token));

    const fetchToken = vi.fn(); // should not be called since token is cached

    mockCreateScript.mockImplementation(() =>
      createFakeResource({ loading: false, state: "ready" }),
    );

    await createRoot(async (dispose) => {
      createPlaidLink(() => ({
        fetchToken,
        onSuccess: vi.fn(),
        cache: true,
        cacheOptions: {
          storage: localStorage,
          storageKey,
          bufferMs: 10_000,
        },
      }));

      await waitFor(() => {
        expect(fetchToken).not.toHaveBeenCalled();
      });

      dispose();
    });

    // Cleanup
    localStorage.removeItem(storageKey);
  });
});
