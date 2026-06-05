/** Lightweight work-type hints from a prompt. These FOCUS the AI; they do not decide. */
const SIGNAL_KEYWORDS: Record<string, string[]> = {
  billing: ["billing", "payment", "stripe", "invoice", "subscription", "refund", "credits"],
  security: ["auth", "login", "password", "token", "stripe", "webhook", "secret", "permission", "rls"],
  design: ["design", "ui", "css", "landing", "hero", "layout", "color", "font", "premium", "polish"],
  data: ["database", "migration", "schema", "sql", "query"],
  testing: ["test", "qa", "playwright", "failing", "flaky"],
  deploy: ["deploy", "ship", "release", "production", "rollback"],
};

export function extractSignals(prompt: string): string[] {
  const p = (prompt ?? "").toLowerCase();
  const hits: string[] = [];
  for (const [signal, words] of Object.entries(SIGNAL_KEYWORDS)) {
    if (words.some((w) => p.includes(w))) hits.push(signal);
  }
  return hits;
}
