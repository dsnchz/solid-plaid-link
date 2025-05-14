import { tryCatch } from "@dschz/try-catch";
import { type Component, createEffect, createSignal, type JSX, Show } from "solid-js";

import { PlaidEmbeddedLink } from "../src/components/PlaidEmbeddedLink";
import { createPlaidLink } from "../src/hooks/createPlaidLink";
import type {
  CreatePlaidLinkConfig,
  CreatePlaidLinkError,
  PlaidCreateLinkToken,
  PlaidLinkError,
  PlaidLinkOnEventMetadata,
  PlaidLinkOnExitMetadata,
  PlaidLinkOnSuccessMetadata,
} from "../src/types";

// Create a custom PlaidButton component using createPlaidLink since PlaidLink is no longer available
type PlaidButtonProps = CreatePlaidLinkConfig & {
  onError?: (error: CreatePlaidLinkError) => void;
  class?: string;
  children: JSX.Element;
};

const PlaidButton: Component<PlaidButtonProps> = (props) => {
  const { ready, error, plaidLink } = createPlaidLink(() => ({
    fetchToken: props.fetchToken,
    onSuccess: props.onSuccess,
    onExit: props.onExit,
    onEvent: props.onEvent,
  }));

  const handleClick = () => {
    plaidLink().open();
  };

  // If there's an error and the error handler is provided, call it
  createEffect(() => {
    const err = error();
    if (err && props.onError) {
      props.onError(err);
    }
  });

  return (
    <button onClick={handleClick} disabled={!ready()} class={props.class}>
      {props.children}
    </button>
  );
};

export const App = () => {
  const [linkType, setLinkType] = createSignal<"button" | "embedded" | null>(null);
  const [status, setStatus] = createSignal<string | null>(null);
  const [successData, setSuccessData] = createSignal<{
    token: string;
    metadata: PlaidLinkOnSuccessMetadata;
  } | null>(null);

  // Mock function to fetch a link token from your backend
  const fetchToken = async () => {
    // In a real app, this would be a call to your backend
    // which would create a link token using Plaid's API
    const [error, data] = await tryCatch(fetch("/api/create_link_token"));

    if (error) {
      console.error("Error fetching link token:", error);
      setStatus(`Error: ${error.message}`);
      throw error;
    }

    const [parseErr, json] = await tryCatch<PlaidCreateLinkToken>(data.json());

    if (parseErr) {
      console.error("Error parsing JSON:", parseErr);
      setStatus(`Error: ${parseErr.message}`);
      throw parseErr;
    }

    return {
      link_token: json.link_token,
      expiration: json.expiration ?? new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  };

  const handleSuccess = (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
    console.log("Success!", publicToken, metadata);
    setSuccessData({ token: publicToken, metadata });
    setStatus("Link success!");
  };

  const handleExit = (error: PlaidLinkError | null, metadata: PlaidLinkOnExitMetadata) => {
    console.log("Exit!", error, metadata);
    if (error) {
      setStatus(`Error: ${error.error_message}`);
    } else {
      setStatus(`Exited: ${metadata.status}`);
    }
  };

  const handleEvent = (event: string, metadata: PlaidLinkOnEventMetadata) => {
    console.log("Event:", event, metadata);
    setStatus(`Event: ${event}`);
  };

  const handleError = (error: CreatePlaidLinkError) => {
    console.error("Error:", error);
    setStatus(`Error: ${error.message}`);
  };

  const reset = () => {
    setLinkType(null);
    setStatus(null);
    setSuccessData(null);
  };

  return (
    <div class="min-h-screen bg-slate-900 text-white p-8">
      <header class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Solid Plaid Link Playground</h1>
        <p class="text-slate-300">Explore the different Plaid Link components</p>
      </header>

      <div class="bg-slate-800 rounded-lg p-6 mb-8">
        <h2 class="text-xl font-bold mb-4">Choose a Link Type</h2>

        <div class="flex gap-4 mb-6">
          <button
            onClick={() => setLinkType("button")}
            class="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition"
          >
            Standard PlaidLink Button
          </button>

          <button
            onClick={() => setLinkType("embedded")}
            class="px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 transition"
          >
            Embedded PlaidLink
          </button>

          {(linkType() || status()) && (
            <button
              onClick={reset}
              class="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 transition"
            >
              Reset
            </button>
          )}
        </div>

        <Show when={status()}>
          <div class="bg-slate-700 p-4 rounded-md mb-4">
            <p class="font-mono">{status()}</p>
          </div>
        </Show>

        <Show when={successData()}>
          <div class="bg-green-800 p-4 rounded-md">
            <h3 class="font-bold mb-2">Success!</h3>
            <p class="mb-2">
              Public Token: <span class="font-mono">{successData()?.token}</span>
            </p>
            <div>
              <p class="font-bold">Metadata:</p>
              <pre class="bg-slate-900 p-2 rounded-md mt-2 text-sm overflow-auto max-h-60">
                {JSON.stringify(successData()?.metadata, null, 2)}
              </pre>
            </div>
          </div>
        </Show>
      </div>

      <Show when={linkType() === "button"}>
        <div class="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 class="text-xl font-bold mb-4">PlaidLink Button</h2>
          <div class="flex justify-center">
            <PlaidButton
              fetchToken={fetchToken}
              onSuccess={handleSuccess}
              onExit={handleExit}
              onEvent={handleEvent}
              onError={handleError}
              class="px-6 py-3 bg-blue-600 rounded-md text-lg font-bold hover:bg-blue-700 transition"
            >
              Connect a bank account
            </PlaidButton>
          </div>
        </div>
      </Show>

      <Show when={linkType() === "embedded"}>
        <div class="bg-slate-800 rounded-lg p-6">
          <h2 class="text-xl font-bold mb-4">PlaidEmbeddedLink</h2>
          <div class="bg-white rounded-lg min-h-96">
            <PlaidEmbeddedLink
              class="h-96 w-full"
              fetchToken={fetchToken}
              onSuccess={handleSuccess}
              onExit={handleExit}
              onEvent={handleEvent}
              onError={handleError}
            />
          </div>
        </div>
      </Show>
    </div>
  );
};
