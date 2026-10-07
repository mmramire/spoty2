#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const policyPath = join(root, ".opencode", "model-policy.json");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!existsSync(policyPath)) {
  fail(`No existe ${policyPath}`);
}

const policy = JSON.parse(readFileSync(policyPath, "utf8"));

function save() {
  writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`, "utf8");
}

function syncAgents() {
  const agentDir = join(root, ".opencode", "agents");
  for (const [agent, role] of Object.entries(policy.assignments)) {
    const file = join(agentDir, `${agent}.md`);
    if (!existsSync(file)) {
      console.warn(`WARN: agente no encontrado: ${file}`);
      continue;
    }

    const content = readFileSync(file, "utf8");
    const model = policy.roles[role]?.primary;
    if (!model) {
      console.warn(`WARN: no hay modelo primario para rol ${role}`);
      continue;
    }

    const next = content.replace(/^(model:\s*).+$/m, `$1${model}`);
    if (next !== content) {
      writeFileSync(file, next, "utf8");
      console.log(`${agent}: ${model}`);
    }
  }
}

function list() {
  for (const [role, config] of Object.entries(policy.roles)) {
    console.log(`\n${role}`);
    console.log(`  primario : ${config.primary}`);
    config.fallbacks.forEach((model, index) => console.log(`  fallback ${index + 1}: ${model}`));
  }
}

async function verifyRemote() {
  const key = process.env.OPENCODE_API_KEY;
  if (!key) {
    console.log("No se realizó verificación remota: OPENCODE_API_KEY no está definido.");
    console.log("La validación local de IDs y archivos sí se ejecutará.");
    return;
  }

  const response = await fetch("https://opencode.ai/zen/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!response.ok) {
    fail(`OpenCode Zen respondió ${response.status} al consultar modelos.`);
  }

  const body = await response.json();
  const available = new Set((body.data ?? body.models ?? []).map((item) => item.id));
  const configured = new Set();

  for (const role of Object.values(policy.roles)) {
    configured.add(role.primary.replace(/^opencode\//, ""));
    for (const fallback of role.fallbacks) configured.add(fallback.replace(/^opencode\//, ""));
  }

  const missing = [...configured].filter((id) => id.startsWith("ollama/") ? false : !available.has(id));
  if (missing.length) {
    console.log("Modelos no encontrados en el catálogo remoto:");
    for (const model of missing) console.log(`- ${model}`);
  } else {
    console.log("Todos los modelos OpenCode configurados aparecen en el catálogo remoto.");
  }
}

async function main() {
  const [command, arg1, arg2] = process.argv.slice(2);

  switch (command) {
    case "list":
      list();
      break;

    case "sync":
      syncAgents();
      break;

    case "set": {
      if (!arg1 || !arg2) fail("Uso: set <rol> <provider/model>");
      if (!policy.roles[arg1]) fail(`Rol desconocido: ${arg1}`);
      policy.roles[arg1].primary = arg2;
      save();
      syncAgents();
      console.log(`Primario actualizado: ${arg1} → ${arg2}`);
      break;
    }

    case "promote": {
      if (!arg1 || !arg2) fail("Uso: promote <rol> <indice-fallback>");
      if (!policy.roles[arg1]) fail(`Rol desconocido: ${arg1}`);
      const index = Number(arg2);
      if (!Number.isInteger(index) || index < 1) fail("El índice debe ser un entero positivo.");
      const fallback = policy.roles[arg1].fallbacks[index - 1];
      if (!fallback) fail(`No existe fallback ${index} para el rol ${arg1}.`);
      policy.roles[arg1].primary = fallback;
      save();
      syncAgents();
      console.log(`Fallback promovido: ${arg1} → ${fallback}`);
      break;
    }

    case "verify":
      syncAgents();
      await verifyRemote();
      break;

    default:
      console.log(`Uso:

  node scripts/opencode-v3-models.mjs list
  node scripts/opencode-v3-models.mjs sync
  node scripts/opencode-v3-models.mjs set <rol> <provider/model>
  node scripts/opencode-v3-models.mjs promote <rol> <indice-fallback>
  node scripts/opencode-v3-models.mjs verify
`);
  }
}

await main();
