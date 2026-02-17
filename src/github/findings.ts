import type { Finding } from "../types";

export type PullRequestReviewComment = {
  path: string;
  body: string;
  line?: number;
  original_line?: number;
  user?: {
    login?: string;
  };
};

function summarizeCommentBody(body: string): string {
  const line = body
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 0);

  return (line ?? "Missing summary").slice(0, 240);
}

function reviewerAllowed(login: string | undefined, allowedReviewAuthors: string[]): boolean {
  if (!login) return false;
  const normalized = login.toLowerCase();
  const allowed = allowedReviewAuthors.map((author) => author.toLowerCase());

  if (allowed.includes(normalized)) {
    return true;
  }

  return normalized.includes("greptile");
}

export function extractFindingsFromReviewComments(
  comments: PullRequestReviewComment[],
  allowedReviewAuthors: string[]
): Finding[] {
  const findings: Finding[] = [];

  for (const comment of comments) {
    if (!reviewerAllowed(comment.user?.login, allowedReviewAuthors)) {
      continue;
    }

    findings.push({
      file: comment.path,
      line: comment.line ?? comment.original_line,
      summary: summarizeCommentBody(comment.body)
    });
  }

  if (findings.length > 0) {
    return findings;
  }

  return [
    {
      file: "unknown",
      summary: "Review requested changes, but no matching inline comments were found."
    }
  ];
}
