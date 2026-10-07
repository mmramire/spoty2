#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const required = [
  "AGENTS.md",
  "opencode.json",
  ".opencode/model-policy.json",
  ".opencode/model-policy.md",
  ".opencode/skill-registry.md",
  ".opencode/agents/sdd.md",
  ".opencode/agents/feature-planner.md",
  ".opencode/agents/spec-reviewer.md",
  ".opencode/agents/architecture-agent.md",
  ".opencode/agents/change-analyzer.md",
  ".opencode/agents/task-planner.md",
  ".opencode/agents/tdd-implementer.md",
  ".opencode/agents/test-reviewer.md",
  ".opencode/agents/final-validator.md",
  ".opencode/agents/skill-researcher.md",
  ".opencode/agents/commit-agent.md",
  ".opencode/skills/tdd/SKILL.md",
  ".opencode/skills/testing/SKILL.md",
  ".opencode/skills/library-research/SKILL.md",
  ".opencode/skills/skill-intake/SKILL.md",
  ".opencode/skills/change-impact/SKILL.md",
  ".opencode/skills/architecture-review/SKILL.md",
  ".opencode/skills/traceability/SKILL.md"
];

let errors = 0;
for (const relative of required) {
  const full = join(root, relative);
  if (!existsSync(full)) {
    console.error(`FALTA: ${relative}`);
    errors += 1;
  }
}

try {
  JSON.parse(readFileSync(join(root, "opencode.json"), "utf8"));
  JSON.parse(readFileSync(join(root, ".opencode/model-policy.json"), "utf8"));
  console.log("JSON: válido");
} catch (error) {
  console.error(`JSON inválido: ${error.message}`);
  errors += 1;
}

if (errors > 0) {
  console.error(`Validación fallida: ${errors} problema(s).`);
  process.exit(1);
}

console.log("Estructura OpenCode v3: válida");
