import { createClient } from "@base44/sdk";

export const BASE44_APP_ID = "68f872ca8ce6660b34aeb6f6";
export const BASE44_APP_DOMAIN =
  import.meta.env.VITE_BASE44_APP_DOMAIN || "https://deepner.ro";
export const BASE44_SERVER_URL =
  import.meta.env.VITE_BASE44_SERVER_URL || "https://app.base44.com";

export const base44 = createClient({
  appId: BASE44_APP_ID,
  serverUrl: BASE44_SERVER_URL,
  autoInitAuth: true,
});
