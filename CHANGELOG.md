# @dschz/solid-plaid-link

## 0.1.2

### Patch Changes

- adds jsdoc comments to all exported types

## 0.1.1

### Patch Changes

- adds return type to EmbeddedLink to comply with JSR publish
- removes global window declaration to comply with JSR publish

## 0.1.0

### 🚀 Initial Release

- First official release of `@dschz/solid-plaid-link` 🎉
- Provides the `createPlaidLink` hook for full programmatic control over the Plaid Link flow
- Includes the `<PlaidEmbeddedLink />` component for embedded iframe-based integrations
- Built-in support for:
  - Plaid script loading and teardown
  - Link token refresh before expiration
  - OAuth redirects (`receivedRedirectUri`)
  - Session-based caching with configurable storage
- Fully typed with SolidJS-first ergonomics
