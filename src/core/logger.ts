export function info(message: string, data?: unknown): void {
  if (data === undefined) {
    console.log(`[agentfix] ${message}`);
    return;
  }
  console.log(`[agentfix] ${message}`, data);
}

export function warn(message: string, data?: unknown): void {
  if (data === undefined) {
    console.warn(`[agentfix] ${message}`);
    return;
  }
  console.warn(`[agentfix] ${message}`, data);
}

export function fail(message: string, data?: unknown): never {
  if (data === undefined) {
    throw new Error(`[agentfix] ${message}`);
  }
  throw new Error(`[agentfix] ${message} ${JSON.stringify(data)}`);
}
