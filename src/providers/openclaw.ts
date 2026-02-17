import type { DispatchResult } from "../types";

export type OpenClawDispatchInput = {
  baseUrl: string;
  token: string;
  model: string;
  prompt: string;
  timeoutMs?: number;
};

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function dispatchOpenClaw(input: OpenClawDispatchInput): Promise<DispatchResult> {
  const endpoint = `${normalizeBaseUrl(input.baseUrl)}/v1/chat/completions`;
  const timeoutMs = input.timeoutMs ?? 30_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: "user", content: input.prompt }],
        stream: false
      }),
      signal: controller.signal
    });

    const text = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      payload = { raw: text };
    }

    const dispatchId =
      typeof payload.id === "string"
        ? payload.id
        : typeof payload.response_id === "string"
          ? payload.response_id
          : undefined;

    if (!response.ok) {
      return {
        ok: false,
        provider: "openclaw",
        model: input.model,
        httpCode: response.status,
        dispatchId,
        message: `Dispatch failed with HTTP ${response.status}`
      };
    }

    return {
      ok: true,
      provider: "openclaw",
      model: input.model,
      httpCode: response.status,
      dispatchId,
      message: "Dispatch accepted"
    };
  } catch (error) {
    return {
      ok: false,
      provider: "openclaw",
      model: input.model,
      httpCode: 0,
      message: error instanceof Error ? error.message : "Unknown dispatch error"
    };
  } finally {
    clearTimeout(timer);
  }
}

export const internal = { normalizeBaseUrl };
