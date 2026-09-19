import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface AuthenticatedRpcClient {
  client: SupabaseClient;
  accessToken: string;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status: number, details?: unknown): Response {
  return jsonResponse({ error: message, details }, status);
}

export async function requireAuthenticatedRpcClient(
  request: Request,
): Promise<AuthenticatedRpcClient> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("AUTH_REQUIRED");
  }
  const accessToken = authorization.slice("Bearer ".length).trim();
  if (!accessToken) {
    throw new Error("AUTH_REQUIRED");
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !publishableKey) {
    throw new Error("FUNCTION_CONFIGURATION_MISSING");
  }
  const client = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error("AUTH_REQUIRED");
  }
  return { client, accessToken };
}

export function handleOptions(request: Request): Response | null {
  return request.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders }) : null;
}

export async function callRpc(
  request: Request,
  rpcName: string,
  payload: unknown,
): Promise<Response> {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;
  if (request.method !== "POST") return errorResponse("POST is required.", 405);
  try {
    const { client } = await requireAuthenticatedRpcClient(request);
    const { data, error } = await client.rpc(rpcName, { p_request: payload });
    if (error) {
      const status = error.code === "42501" ? 403 : error.code === "28000" ? 401 :
        error.code === "40001" ? 503 : 400;
      return errorResponse("Sync RPC rejected the request.", status, { code: error.code });
    }
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown function error.";
    if (message === "AUTH_REQUIRED") return errorResponse("Authentication is required.", 401);
    if (message === "FUNCTION_CONFIGURATION_MISSING") return errorResponse("Function configuration is incomplete.", 500);
    return errorResponse("Invalid sync request.", 400);
  }
}
