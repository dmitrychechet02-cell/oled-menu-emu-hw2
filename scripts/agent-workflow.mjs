// Переносимая память проекта и запуск уже установленного GSD Core без зависимостей.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const read = (root, path) => {
  const file = join(root, path);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
};

export function buildContext(root) {
  const state = read(root, ".planning/STATE.md");
  const plan = read(root, "docs/plan.md");
  const memory = read(root, "docs/memory.md");
  const last = memory
    .split(/\r?\n(?=## )/)
    .at(-1)
    .trim();
  const open = plan
    .split(/\r?\n/)
    .filter((line) => /^\s*- \[ \]/.test(line))
    .slice(0, 10);
  const parts = ["# Контекст для продолжения OLED Menu Emulator"];
  if (state) parts.push(`## Текущее состояние GSD\n${state.slice(0, 6000)}`);
  parts.push(`## Открытые задачи\n${open.join("\n") || "Нет открытых задач"}`);
  if (last) parts.push(`## Последняя запись памяти\n${last.slice(0, 3500)}`);
  parts.push(
    "Сначала прочитай AGENTS.md. Текущая задача определяется STATE.md и последним " +
      "запросом пользователя. Перед изменением кода используй graft. " +
      "Открой нужный PLAN.md из .planning/phases/. После работы обнови STATE.md, " +
      "docs/plan.md и docs/memory.md. Чекпойнт не заменяет исходные документы.",
  );
  return `${parts.join("\n\n")}\n`;
}

export function saveCheckpoint(root) {
  const content = buildContext(root);
  const path = join(root, "docs/context-checkpoint.md");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  return path;
}

export function findGsd() {
  const roots = [process.env.CODEX_HOME, join(homedir(), ".codex"), join(homedir(), ".claude")];
  for (const root of roots.filter(Boolean)) {
    const core = join(root, "gsd-core");
    if (existsSync(join(core, "bin/gsd-tools.cjs"))) return core;
  }
  return null;
}

function main() {
  const root = process.cwd();
  const command = process.argv[2];
  if (command === "resume") return process.stdout.write(buildContext(root));
  if (command === "checkpoint") return console.log(`Чекпойнт: ${saveCheckpoint(root)}`);
  const core = findGsd();
  if (command === "doctor") {
    const files = [
      ".planning/PROJECT.md",
      ".planning/ROADMAP.md",
      ".planning/STATE.md",
      ".planning/REQUIREMENTS.md",
      "docs/architecture.md",
      "docs/security-checklist.md",
    ];
    console.log(
      `Node ${process.version}; GSD Core: ${core ? read(core, "VERSION").trim() : "не найден"}`,
    );
    for (const file of files)
      console.log(`${existsSync(join(root, file)) ? "OK" : "MISSING"} ${file}`);
    if (!core || files.some((file) => !existsSync(join(root, file)))) process.exitCode = 1;
    return;
  }
  if (command === "gsd" && core) {
    const args = process.argv.slice(3);
    const result = spawnSync(process.execPath, [join(core, "bin/gsd-tools.cjs"), ...args], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error) console.error(result.error.message);
    process.exitCode = result.status ?? 1;
    return;
  }
  console.error(
    "Команды: doctor, resume, checkpoint, gsd <команда GSD Core>. Для GSD нужен установленный gsd-core.",
  );
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
