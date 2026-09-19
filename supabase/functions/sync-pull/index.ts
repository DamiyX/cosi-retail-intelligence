import { assertPullRequest, parseJson } from "../_shared/protocol.ts";
import { callRpc, errorResponse, handleOptions } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;
  if (request.method !== "POST") return errorResponse("POST is required.", 405);
  try {
    const payload = assertPullRequest(await parseJson(request));
    return await callRpc(request, "sync_pull", payload);
  } catch {
    return errorResponse("Invalid sync pull envelope.", 400);
  }
});
