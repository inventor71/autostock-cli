// Lockdown is defense-in-depth, in TWO layers:
//   1. PERMISSION (this script): our shipped opencode.json `permission` is checked against
//      opencode's REAL permission engine (Permission.fromConfig + evaluate) — deterministic,
//      no LLM/TUI. Run from the fork dir: bun run verify-lockdown.ts
//   2. COMPILE-TIME REMOVAL (F4 Phase 3): under AUTOSTOCK_LOCKDOWN=on the side-effect builtins
//      are not registered AT ALL (registry.ts), so opencode's permission bugs (#5894/#6396) are
//      structurally moot — not merely denied. That ABSENCE guarantee is asserted in
//      packages/opencode/test/tool/registry.test.ts ("autostock lockdown removes side-effect
//      builtins"). Run: bun test test/tool/registry.test.ts
// This script verifies layer 1; the registry test verifies layer 2.
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
