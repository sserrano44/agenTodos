import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  consumeOAuthAuthorizationCode,
  exchangeOAuthRefreshToken,
  formatOAuthScope,
  getMcpResourceUrl,
  issueOAuthTokens,
  parseOAuthScope,
  verifyPkceCodeVerifier,
} from "@/lib/auth/oauth";
import { ApiError, jsonError } from "@/lib/http/api";

const authorizationCodeGrantSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1),
  client_id: z.string().min(1),
  redirect_uri: z.string().min(1),
  code_verifier: z.string().min(1),
  resource: z.string().optional(),
});

const refreshTokenGrantSchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(1),
  client_id: z.string().min(1),
  scope: z.string().optional(),
});

async function parseTokenRequest(request: NextRequest) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

function jsonTokenResponse(body: {
  token_type: "Bearer";
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parseTokenRequest(request);

    if (payload.grant_type === "authorization_code") {
      const input = authorizationCodeGrantSchema.parse(payload);
      const resource = input.resource ?? getMcpResourceUrl();
      const codeRecord = await consumeOAuthAuthorizationCode({
        code: input.code,
        clientId: input.client_id,
        redirectUri: input.redirect_uri,
        resource,
      });

      verifyPkceCodeVerifier(
        input.code_verifier,
        codeRecord.code_challenge,
        codeRecord.code_challenge_method,
      );

      const issued = await issueOAuthTokens({
        userId: codeRecord.user_id,
        workspaceId: codeRecord.workspace_id,
        clientId: codeRecord.client_id,
        scope: codeRecord.scope,
        resource: codeRecord.resource,
      });

      return jsonTokenResponse({
        token_type: "Bearer",
        access_token: issued.accessToken,
        expires_in: issued.accessTokenExpiresIn,
        refresh_token: issued.refreshToken,
        scope: formatOAuthScope(issued.scope),
      });
    }

    if (payload.grant_type === "refresh_token") {
      const input = refreshTokenGrantSchema.parse(payload);
      const issued = await exchangeOAuthRefreshToken({
        refreshToken: input.refresh_token,
        clientId: input.client_id,
        scope: input.scope ? parseOAuthScope(input.scope) : undefined,
      });

      return jsonTokenResponse({
        token_type: "Bearer",
        access_token: issued.accessToken,
        expires_in: issued.accessTokenExpiresIn,
        refresh_token: issued.refreshToken,
        scope: formatOAuthScope(issued.scope),
      });
    }

    throw new ApiError({
      code: "unsupported_grant_type",
      message: "Only authorization_code and refresh_token grants are supported.",
      status: 400,
    });
  } catch (error) {
    return jsonError(error);
  }
}
