import { tryCatch } from "@dschz/try-catch";
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from "plaid";

// Load Plaid credentials from environment
const clientId = process.env.PLAID_CLIENT_ID ?? "";
const secret = process.env.PLAID_SECRET ?? "";

// Initialize Plaid client
const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  }),
);

// Serve API using Bun v1.2.3+ `routes` API
const server = Bun.serve({
  port: 8000,

  routes: {
    "/api/create_link_token": {
      GET: async () => {
        const [err, res] = await tryCatch(
          plaid.linkTokenCreate({
            user: { client_user_id: "test-user-id" },
            client_name: "solid-plaid-link playground",
            products: [Products.Auth],
            country_codes: [CountryCode.Us],
            language: "en",
          }),
        );

        if (err) {
          console.error("[Plaid Error]", err);
          return Response.json({ error: "Failed to create link token" }, { status: 500 });
        }

        return Response.json(
          { link_token: res.data.link_token },
          {
            headers: {
              "Access-Control-Allow-Origin": "*", // Dev only
            },
          },
        );
      },
    },

    "/api/status": new Response("OK"),
  },

  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server is running on ${server.url}`);
