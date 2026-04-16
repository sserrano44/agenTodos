import { buildMcpServer, createMcpTransport } from "@/lib/mcp/server";
import { authenticateAgentToken } from "@/lib/data/agents";
import {
  authenticateOAuthAccessToken,
  buildMcpOauthChallengeResponse,
} from "@/lib/auth/oauth";
import { ApiError, jsonError } from "@/lib/http/api";

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

type McpAuthContext =
  | {
      workspaceId: string;
      actor: {
        actorType: "agent";
        actorId: string;
      };
    }
  | {
      workspaceId: string;
      actor: {
        actorType: "admin";
        actorId: string;
      };
    };

async function authenticateMcpRequest(request: Request): Promise<McpAuthContext> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    throw new ApiError({
      code: "unauthorized",
      message: "Authorization required.",
      status: 401,
    });
  }

  const token = authorization.slice(7).trim();

  try {
    const agentAuth = await authenticateAgentToken(token, ["mcp:use"]);
    return {
      workspaceId: agentAuth.workspaceId,
      actor: {
        actorType: "agent",
        actorId: agentAuth.agent.id,
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      throw error;
    }

    const oauthAuth = await authenticateOAuthAccessToken(token, ["mcp:use"]);
    if (!oauthAuth) {
      throw new ApiError({
        code: "unauthorized",
        message: "Authorization required.",
        status: 401,
      });
    }

    return {
      workspaceId: oauthAuth.workspaceId,
      actor: {
        actorType: "admin",
        actorId: oauthAuth.userId,
      },
    };
  }
}

export async function GET(request: Request) {
  try {
    await authenticateMcpRequest(request);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return withCors(buildMcpOauthChallengeResponse(error.message));
    }

    return withCors(jsonError(error));
  }

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
    const auth = await authenticateMcpRequest(request);
    const server = buildMcpServer(auth);
    const transport = createMcpTransport();

    await server.connect(transport);

    try {
      const response = await transport.handleRequest(request);
      return withCors(response);
    } finally {
      await Promise.allSettled([transport.close(), server.close()]);
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return withCors(buildMcpOauthChallengeResponse(error.message));
    }

    return withCors(jsonError(error));
  }
}
