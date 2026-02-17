import { createSign } from "node:crypto";

export type GitHubAppRuntimeConfig = {
  appId: string;
  privateKey: string;
  webhookSecret: string;
  apiBaseUrl: string;
};

function base64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function normalizePrivateKey(rawKey: string): string {
  return rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
}

export function buildGitHubAppJwt(appId: string, privateKeyRaw: string, nowUnixSeconds = Math.floor(Date.now() / 1000)): string {
  const privateKey = normalizePrivateKey(privateKeyRaw);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iat: nowUnixSeconds - 60,
      exp: nowUnixSeconds + 9 * 60,
      iss: appId
    })
  );

  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  const signature = signer
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${signature}`;
}

async function githubApiRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} ${url}: ${text.slice(0, 300)}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function createInstallationToken(runtime: GitHubAppRuntimeConfig, installationId: number): Promise<{ token: string; expiresAt: string }> {
  const jwt = buildGitHubAppJwt(runtime.appId, runtime.privateKey);
  const url = `${runtime.apiBaseUrl.replace(/\/$/, "")}/app/installations/${installationId}/access_tokens`;

  const data = await githubApiRequest<{ token: string; expires_at: string }>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "agentfix"
    }
  });

  return { token: data.token, expiresAt: data.expires_at };
}

export async function listPullRequestReviewComments(
  runtime: GitHubAppRuntimeConfig,
  installationToken: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<Array<{ path: string; body: string; line?: number; original_line?: number; user?: { login?: string } }>> {
  const url = `${runtime.apiBaseUrl.replace(/\/$/, "")}/repos/${owner}/${repo}/pulls/${pullNumber}/comments?per_page=100`;
  return githubApiRequest(url, {
    method: "GET",
    headers: {
      Authorization: `token ${installationToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "agentfix"
    }
  });
}

export async function postIssueComment(
  runtime: GitHubAppRuntimeConfig,
  installationToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const url = `${runtime.apiBaseUrl.replace(/\/$/, "")}/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  await githubApiRequest(url, {
    method: "POST",
    headers: {
      Authorization: `token ${installationToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "agentfix",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });
}

export function parseRepository(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repository name: ${fullName}`);
  }
  return { owner, repo };
}
