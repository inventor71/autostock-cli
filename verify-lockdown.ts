// Verifies our shipped opencode.json `permission` against opencode's REAL permission
// engine (Permission.fromConfig + evaluate) — deterministic, no LLM/TUI. Run from the
// fork dir: bun run verify-lockdown.ts
import { readFileSync } from "node:fs";
import { evaluate, fromConfig } from "./packages/opencode/src/permission/index.ts";

const cfg = JSON.parse(readFileSync(new URL("./opencode.json", import.meta.url), "utf8"));
const ruleset = fromConfig(cfg.permission);

const act = (perm: string) => (evaluate as any)(perm, "*", ruleset).action;

const cases: Array<[string, string]> = [
  // default-deny proves ANY non-allowlisted tool (edit/write/bash/task/webfetch/...) is denied
  ["edit", "deny"],
  ["write", "deny"],
  ["bash", "deny"],
  ["task", "deny"], // closes the #5894 subagent bypass
  ["webfetch", "deny"],
  ["some_random_unlisted_tool", "deny"], // proves the "*" default-deny catches everything
  // allowlist
  ["read", "allow"],
  ["glob", "allow"],
  ["grep", "allow"],
  ["lsp", "allow"],
  // our MCP tools
  ["autostock_steer", "ask"],
  ["autostock_steer_read", "allow"],
];

let ok = true;
for (const [perm, want] of cases) {
  const got = act(perm);
  const pass = got === want;
  ok &&= pass;
  console.log(`[${pass ? "PASS" : "FAIL"}] ${perm.padEnd(28)} got=${got} want=${want}`);
}
console.log(ok
  ? "\nRESULT: PASS ✅  lockdown verified against opencode's real permission engine"
  : "\nRESULT: FAIL ❌");
process.exit(ok ? 0 : 1);
