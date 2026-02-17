export type GitHubAppManifestInput = {
  appName: string;
  appUrl: string;
  webhookUrl: string;
  callbackUrl: string;
  description?: string;
};

export function githubAppManifestTemplate(input: GitHubAppManifestInput): string {
  const manifest = {
    name: input.appName,
    url: input.appUrl,
    hook_attributes: {
      url: input.webhookUrl,
      active: true
    },
    redirect_url: input.callbackUrl,
    callback_urls: [input.callbackUrl],
    description: input.description ?? "AgentFix GitHub App for automated remediation and bug-hunt orchestration.",
    public: false,
    default_permissions: {
      contents: "read",
      issues: "write",
      pull_requests: "read",
      metadata: "read"
    },
    default_events: ["pull_request_review", "issue_comment", "ping"]
  };

  return `${JSON.stringify(manifest, null, 2)}\n`;
}
