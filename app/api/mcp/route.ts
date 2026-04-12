import { buildMcpServer, createMcpTransport } from "@/lib/mcp/server";
import { authenticateAgentRequest } from "@/lib/data/agents";
import { jsonError } from "@/lib/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withCors(response: Response) {
  const next = new Response(response.body, response);
  next.headers.set("Access-Control-Allow-Origin", "*");
  next.headers.set(
    "Access-Control-Allow-Headers",
    "authorization, content-type, mcp-protocol-version, mcp-session-id",
  );
  next.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return next;
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}

export async function GET() {
  return withCors(
    new Response(
      JSON.stringify({
        error: {
          code: "method_not_allowed",
          message: "Use POST for Streamable HTTP MCP requests.",
        },
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      },
    ),
  );
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateAgentRequest(request, ["mcp:use"]);
    const server = buildMcpServer(auth.agent);
    const transport = createMcpTransport();

    await server.connect(transport);

    try {
      const response = await transport.handleRequest(request);
      return withCors(response);
    } finally {
      await Promise.allSettled([transport.close(), server.close()]);
    }
  } catch (error) {
    return withCors(jsonError(error));
  }
}
