<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=Ecosystem&background=tiles&project=solid-plaid-link" alt="solid-plaid-link">
</p>

# @dschz/solid-plaid-link

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@dschz/solid-plaid-link?color=blue)](https://www.npmjs.com/package/@dschz/solid-plaid-link)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@dschz/solid-uplot)](https://bundlephobia.com/package/@dschz/solid-plaid-link)
[![CI](https://github.com/dsnchz/solid-plaid-link/actions/workflows/ci.yaml/badge.svg)](https://github.com/dsnchz/solid-plaid-link/actions/workflows/ci.yaml)
[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?logo=discord&logoColor=white)](https://discord.gg/McSuU38GHg)

SolidJS library for integrating with [Plaid Link](https://plaid.com/docs/link/). Dynamically loads the Link script, manages token expiration, supports OAuth redirects, and caches tokens safely across reloads.

## ✨ Features

- 🧠 `createPlaidLink` hook for full control over the Link lifecycle
- 📊 `<PlaidEmbeddedLink />` component for iframe-based embedded UI
- 🔁 Built-in caching to persist tokens across reloads (OAuth-safe)
- 💡 Works seamlessly with custom UI libraries like Kobalte, Ark, Solid UI, or Tailwind

## 📆 Installation

```bash
npm install @dschz/solid-plaid-link
pnpm install @dschz/solid-plaid-link
yarn install @dschz/solid-plaid-link
bun install @dschz/solid-plaid-link
```

## 🔌 Core: `createPlaidLink`

Use `createPlaidLink` when you want full control over when and how to open Plaid Link imperatively.

```tsx
import { createPlaidLink } from "@dschz/solid-plaid-link";

const { ready, error, plaidLink } = createPlaidLink(() => ({
  fetchToken: () => fetch("/api/create-link-token").then((res) => res.json()),
  onSuccess: (publicToken, meta) => console.log(publicToken),
}));

return (
  <button disabled={!ready()} onClick={() => plaidLink().open()}>
    Connect Bank Account
  </button>
);
```

> 💡 You can pair `createPlaidLink` with any UI library of your choice (e.g., Kobalte, Ark UI, Solid UI, Tailwind, etc.) to build a fully custom button that triggers Plaid Link.

## 🖼️ `PlaidEmbeddedLink`

Use this JSX component when you want to embed the Link experience directly into the page via `Plaid.createEmbedded`.

```tsx
import { PlaidEmbeddedLink } from "@dschz/solid-plaid-link";

<PlaidEmbeddedLink
  fetchToken={() => fetch("/api/create-link-token").then((r) => r.json())}
  onSuccess={(token, meta) => console.log(token)}
  onError={(err) => console.error(err)}
/>;
```

> 🔒 OAuth-safe: `receivedRedirectUri` can be passed to resume the session after redirect.

## 🔁 Token Caching (for OAuth + reload resilience)

Plaid link tokens are automatically cached (in `sessionStorage` by default) when you use `createPlaidLink` or `PlaidEmbeddedLink`. This is useful for:

- Surviving OAuth redirects
- Avoiding repeated calls to your backend

Caching is enabled by default. You can customize or disable it:

```tsx
createPlaidLink(() => ({
  fetchToken: () => fetch("/api/create-link-token").then((r) => r.json()),
  cache: true, // default
  cacheOptions: {
    storage: localStorage, // or sessionStorage (default)
    storageKey: "my_plaid_token",
    bufferMs: 30000, // time before expiration to refresh
  },
  onSuccess: console.log,
}));
```

## 🔀 OAuth Redirects

To support institutions that require OAuth, pass `receivedRedirectUri` into the hook or component after the redirect.

```tsx
const isOAuth = window.location.search.includes("oauth_state_id");

createPlaidLink(() => ({
  fetchToken: () => fetch("/api/create-link-token").then((r) => r.json()),
  receivedRedirectUri: isOAuth ? window.location.href : undefined,
  onSuccess: console.log,
}));
```

## 🧪 Testing

- ESM-native and works with `vitest`, `bun`, or `jest` + JSDOM
- You can mock `window.Plaid`, `localStorage`, or `sessionStorage` easily

## 💪 Types

```ts
type CreatePlaidLinkConfig = {
  fetchToken: () => Promise<{ link_token: string; expiration: string }>;
  onSuccess: (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => void;
  onExit?: (...);
  onEvent?: (...);
  onLoad?: () => void;
  receivedRedirectUri?: string;
  cache?: boolean;
  cacheOptions?: {
    storage?: Storage;
    storageKey?: string;
    bufferMs?: number;
  };
};
```

Additional types like `PlaidLinkError`, `PlaidLinkOnExitMetadata`, and `PlaidLinkOnEventMetadata` are exported for convenience.

## 🧪 Playground Sandbox

This repo includes a full working example app to test Plaid Link with your API keys.

### Running the Playground

1. Clone the repo:

   ```bash
   git clone https://github.com/dsnchz/solid-plaid-link.git
   cd solid-plaid-link
   ```

2. Install deps:

   ```bash
   npm install
   pnpm install
   yarn install
   bun install
   ```

3. Add `.env` with your Plaid keys:

   ```
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_secret_key
   ```

4. Run frontend + backend:

   ```bash
   bun run start          # frontend
   bun run start:server   # backend
   ```

5. Visit [http://localhost:3000](http://localhost:3000)

> The Bun backend handles link token creation and must be running.

## 🙋‍♂️ Feedback

Found an issue or have a question?
Open a discussion or PR at [github.com/dsnchz/solid-plaid-link](https://github.com/dsnchz/solid-plaid-link).
