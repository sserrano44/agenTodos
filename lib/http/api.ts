import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny } from "zod";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(input: { code: string; message: string; status?: number; details?: unknown }) {
    super(input.message);
    this.code = input.code;
    this.status = input.status ?? 400;
    this.details = input.details;
  }
}

export async function parseJsonBody<TSchema extends ZodTypeAny>(
  request: Request,
  schema: TSchema,
) {
  const json = await request.json().catch(() => {
    throw new ApiError({
      code: "invalid_json",
      message: "Request body must be valid JSON.",
      status: 400,
    });
  });

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw fromZodError(parsed.error);
  }

  return parsed.data;
}

export function fromZodError(error: ZodError) {
  return new ApiError({
    code: "validation_error",
    message: "Request validation failed.",
    status: 422,
    details: error.flatten(),
  });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const apiError = fromZodError(error);
    return NextResponse.json(
      {
        error: {
          code: apiError.code,
          message: apiError.message,
          details: apiError.details ?? null,
        },
      },
      { status: apiError.status },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: "An unexpected error occurred.",
        details: null,
      },
    },
    { status: 500 },
  );
}

export function jsonData(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

