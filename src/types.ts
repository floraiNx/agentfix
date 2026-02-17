export type Finding = {
  file: string;
  line?: number;
  summary: string;
};

export type AutoFixEvent = {
  source: "greptile" | "sentry" | "manual";
  repository: string;
  targetBranch: string;
  issueRef: string;
  findings: Finding[];
};

export type DispatchResult = {
  ok: boolean;
  provider: "openclaw";
  model: string;
  httpCode: number;
  dispatchId?: string;
  message: string;
};
