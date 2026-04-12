import { authenticateAgentRequest } from "@/lib/data/agents";
import { jsonData, jsonError } from "@/lib/http/api";

export async function GET(request: Request) {
  try {
    const auth = await authenticateAgentRequest(request, []);
    return jsonData({
      agent: auth.agent,
      apiKey: auth.apiKey,
    });
  } catch (error) {
    return jsonError(error);
  }
}
