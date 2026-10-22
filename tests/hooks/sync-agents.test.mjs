// CRLF в исходных правилах Windows не должен переносить YAML в инструкции Codex.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("sync:agents удаляет CRLF-frontmatter и остаётся идемпотентным", () => {
  const root = mkdtempSync(join(tmpdir(), "oled-sync-"));
  for (const dir of ["scripts", ".claude/skills/demo", ".claude/rules"])
    mkdirSync(join(root, dir), { recursive: true });
  const script = join(root, "scripts/sync-agents.mjs");
  copyFileSync(resolve("scripts/sync-agents.mjs"), script);
  writeFileSync(join(root, ".claude/skills/demo/SKILL.md"), "# Demo\r\n");
  for (const name of ["firmware", "web"])
    writeFileSync(
      join(root, `.claude/rules/${name}.md`),
      "---\r\npaths: demo\r\n---\r\n\r\n# Правило\r\n",
    );
  for (const args of [[], ["--check"]]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
  }
  const rule = readFileSync(join(root, "tests/e2e/AGENTS.md"), "utf8");
  assert.match(rule, /# Правило/);
  assert.doesNotMatch(rule, /paths:|\r/);
});
