import { supabase } from "./supabase";

// Reads key=value pairs from the query string and from the #fragment
function parseParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const rest = url.split("?").slice(1).join("?");
  const query = rest.split("#")[0];
  const hash = url.split("#").slice(1).join("#");
  for (const part of `${query}&${hash}`.split("&")) {
    if (!part) continue;
    const [key, ...value] = part.split("=");
    params[key] = decodeURIComponent(value.join("=").replace(/\+/g, " "));
  }
  return params;
}

export const isAuthLink = (url: string | null | undefined): url is string =>
  !!url && url.includes("auth/callback");

// A link can reach the app through several listeners; process each URL once
const processed = new Map<string, Promise<string | null>>();

/** Signs the user in from an email confirmation link. Returns an error text or null. */
export function handleAuthUrl(url: string): Promise<string | null> {
  let result = processed.get(url);
  if (!result) {
    result = (async () => {
      const params = parseParams(url);

      if (params.error_description || params.error) {
        return params.error_description ?? params.error;
      }

      if (params.code) {
        // PKCE flow
        const { error } = await supabase.auth.exchangeCodeForSession(
          params.code,
        );
        return error?.message ?? null;
      }
      if (params.access_token && params.refresh_token) {
        // implicit flow (supabase-js default)
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        return error?.message ?? null;
      }
      return "Ссылка недействительна";
    })();
    processed.set(url, result);
  }
  return result;
}
