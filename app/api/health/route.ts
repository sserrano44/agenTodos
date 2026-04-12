import { jsonData } from "@/lib/http/api";

export async function GET() {
  return jsonData({
    ok: true,
    service: "agent-todos",
    timestamp: new Date().toISOString(),
  });
}
