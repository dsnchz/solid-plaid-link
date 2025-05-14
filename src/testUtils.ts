import type { Resource } from "solid-js";
import { type Mocked, vi } from "vitest";

type ResourceConfig = {
  readonly state: "ready" | "unresolved" | "pending" | "errored" | "refreshing";
  readonly loading: boolean;
  readonly error?: Error | null;
};

export const getFuturePlaidExpiration = (hoursFromNow = 4): string => {
  const future = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  return future.toISOString();
};

export const createMockStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  } satisfies Storage;
};

export const createFakeResource = (config: ResourceConfig): Mocked<Resource<HTMLScriptElement>> => {
  const script = document.createElement("script");
  const resource = () => script;
  const undefinedResource = () => undefined;

  switch (config.state) {
    case "refreshing":
    case "ready":
      return Object.assign(resource, {
        state: "ready" as const,
        loading: config.state === "refreshing",
        error: undefined,
        latest: script,
      }) as Mocked<Resource<HTMLScriptElement>>;
    case "pending":
    case "unresolved":
      return Object.assign(undefinedResource, {
        state: config.state,
        loading: config.state === "pending",
        error: undefined,
        latest: undefined,
      }) as Mocked<Resource<HTMLScriptElement>>;
    case "errored":
      return Object.assign(resource, {
        state: "errored" as const,
        loading: false,
        error: config.error,
        latest: script,
      }) as Mocked<Resource<HTMLScriptElement>>;
  }
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
