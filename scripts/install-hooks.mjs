#!/usr/bin/env node
// Instala os git hooks de scripts/hooks/ em .git/hooks/.
// Roda automaticamente via `npm install` (lifecycle "prepare").
import { copyFileSync, chmodSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "scripts", "hooks");
const gitHooksDir = join(root, ".git", "hooks");

if (!existsSync(join(root, ".git"))) {
  // Checkout sem .git (ex.: alguns sandboxes de CI/build) — nada a instalar.
  process.exit(0);
}

for (const name of readdirSync(srcDir)) {
  const src = join(srcDir, name);
  const dest = join(gitHooksDir, name);
  copyFileSync(src, dest);
  chmodSync(dest, 0o755);
  console.log(`[install-hooks] ${name} instalado em .git/hooks/`);
}
