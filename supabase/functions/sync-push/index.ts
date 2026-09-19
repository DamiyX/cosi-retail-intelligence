import { assertPushRequest, parseJson } from "../_shared/protocol.ts";
import { callRpc, errorResponse, handleOptions } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;
  if (request.method !== "POST") return errorResponse("POST is required.", 405);
  try {
    const payload = assertPushRequest(await parseJson(request));
    return await callRpc(request, "sync_push", payload);
  } catch {
    return errorResponse("Invalid sync push envelope.", 400);
  }
});
