// Проверяем восстановление последней записи, лимиты контекста и событие PreCompact.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { buildContext, saveCheckpoint } from "../../scripts/agent-workflow.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "oled-context-"));
  mkdirSync(join(root, "docs"));
  mkdirSync(join(root, ".planning"));
  return root;
}

test("контекст включает STATE и только последнюю запись CRLF-журнала", () => {
  const root = fixture();
  writeFileSync(join(root, ".planning/STATE.md"), "Phase: 1; Plan: 2");
  writeFileSync(join(root, "docs/memory.md"), "# Память\r\n## Старая\r\nOLD\r\n## Новая\r\nNEW");
  writeFileSync(join(root, "docs/plan.md"), "- [x] DONE\n- [ ] TODO");
  const context = buildContext(root);
  assert.match(context, /Phase: 1; Plan: 2/);
  assert.match(context, /NEW/);
  assert.match(context, /TODO/);
  assert.doesNotMatch(context, /OLD|DONE/);
  assert.equal(readFileSync(saveCheckpoint(root), "utf8"), context);
});

test("длинный журнал и список задач ограничены при восстановлении", () => {
  const root = fixture();
  writeFileSync(join(root, "docs/memory.md"), `## Запись\n${"x".repeat(50000)}`);
  writeFileSync(
    join(root, "docs/plan.md"),
    Array.from({ length: 20 }, (_, i) => `- [ ] TASK${i}`).join("\n"),
  );
  const context = buildContext(root);
  assert.ok(context.length < 5000);
  assert.match(context, /TASK9\b/);
  assert.doesNotMatch(context, /TASK10\b/);
});

test("PreCompact сохраняет чекпойнт из cwd события", () => {
  const root = fixture();
  const result = spawnSync(process.execPath, [resolve("scripts/hooks/context-checkpoint.mjs")], {
    input: JSON.stringify({ cwd: root, hook_event_name: "PreCompact", trigger: "manual" }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: "utf8",
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(join(root, "docs/context-checkpoint.md"), "utf8"), /AGENTS.md/);
});
