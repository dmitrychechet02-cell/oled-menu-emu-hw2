# OLED 128×64 Menu Emulator

**Домашнее задание №2: агентно-ориентированный пайплайн разработки.**
Результаты для проверки: [отчёт модуля 2](docs/module-2.md),
[управление контекстом и скриншоты](docs/context-usage.md),
[таблица выполнения задания](#модуль-2-агентно-ориентированный-пайплайн-разработки).
Репозиторий ДЗ №2: [oled-menu-emu-hw2](https://github.com/dmitrychechet02-cell/oled-menu-emu-hw2).
Работа продолжает эмулятор из [ДЗ №1](https://github.com/dmitrychechet02-cell/oled-menu-emu).

Эмулятор меню для монохромного OLED-дисплея 2.42" 128×64 на контроллере **SSD1309**.
Ядро на C (графика, шрифт 5×7 с кириллицей, движок меню, экраны) компилируется в
WebAssembly и работает в браузере, а тот же код без изменений собирается под микроконтроллер.
Железо не нужно: всё проверяется unit-тестами и в эмуляторе.

![Эмулятор](docs/screenshots/emulator.png)

## Быстрый старт

Нужны: `make`, `gcc`, `clang` + `lld` (с целью wasm32), `clang-format`, Node.js ≥ 20, Python 3
(только для перегенерации шрифта).

```bash
npm install
npx playwright install chromium
npm start                # собрать emu.wasm и запустить сервер; открыть http://localhost:8080
```

| Команда               | Что делает                                        |
| --------------------- | ------------------------------------------------- |
| `npm test`            | C unit-тесты (39); Windows — LLVM-MinGW, Unix — Make |
| `make test`           | C unit-тесты через Make, `make test T=menu` — по подстроке |
| `npm run test:e2e`    | e2e в Chromium (5 сценариев)                      |
| `make lint`           | clang-format + сборка wasm и ARM с `-Werror`      |
| `npm run lint`        | всё: C + ESLint + Prettier                        |
| `make fonts`          | перегенерировать шрифт и иконки                   |

**Windows:** проще всего работать в WSL2 (Ubuntu): `sudo apt install build-essential clang lld clang-format`.
Через MSYS2 тоже работает (`pacman -S make mingw-w64-ucrt-x86_64-clang mingw-w64-ucrt-x86_64-lld`).

Для браузера и e2e можно работать прямо в PowerShell без Make: нужен Node.js ≥ 20.11
и `clang` с wasm32/lld в PATH либо распакованный Zig 0.14.1. Для Zig укажи путь
в текущей сессии (в этом рабочем каталоге он уже распакован в `build/tools/`):

```powershell
cd C:\Users\chechet.d\Desktop\oled-menu-emu
$env:ZIG_EXE = "$PWD\build\tools\zig-x86_64-windows-0.14.1\zig.exe"
npm install --package-lock=false --ignore-scripts
npx playwright install chromium
npm run test:e2e
```

На другом компьютере замени путь к `zig.exe` своим. Если установлен `clang`,
сборка использует его; иначе — `ZIG_EXE` или локальный путь выше. Флаги предупреждений,
`-Werror`, freestanding и отсутствие libc сохраняются. `npm start` использует ту же
сборку. На Linux/macOS `npm run build` вызывает `make wasm`.
Для `make lint` нужны инструменты из быстрого старта; ниже есть эквивалент через npm
для PowerShell.

C unit-тесты можно запускать отдельно в PowerShell через
[LLVM-MinGW UCRT](https://github.com/mstorsjo/llvm-mingw/releases): распакуй Windows
x86_64 UCRT-архив в `build/tools/` и укажи путь к его `clang.exe`:

```powershell
$env:UNIT_CC = "$PWD\build\tools\llvm-mingw-20261006-ucrt-x86_64\bin\clang.exe"
npm test                         # все 39 C unit-тестов
npm test -- menu_value_edit       # один тест по подстроке
```

В этом рабочем каталоге используется LLVM-MinGW 20261006. На другом компьютере
замени путь на свой. Сборка сохраняет `-Werror`, AddressSanitizer и UBSan;
ошибки sanitizer завершают прогон с ненулевым кодом. Лог — `build/unit-tests.log`.
Zig не используется для этой команды: в локальной версии его ASan не обнаружил
контрольное переполнение heap. На Linux/macOS `npm test` вызывает `make test`.

HTML-отчёт после тестов: `npx playwright show-report`.

Полный C-линтер в PowerShell (использует тот же LLVM-MinGW и Zig):

```powershell
npm run lint:c       # ARM freestanding + сборка wasm + формат всех .c/.h
npm run lint         # C-проверки выше + ESLint + Prettier
```

Пути по умолчанию — локальные каталоги `build/tools/`, описанные выше. Для другой
установки задай `C_CLANG` (полный путь к clang.exe), `C_CLANG_FORMAT` (к clang-format.exe)
и `ZIG_EXE`. Проверки используют флаги Makefile, включая `-Werror`; форматирование
проверяется через `--dry-run --Werror` во всех файлах `src/` и `tests/unit/`.
На Unix `npm run lint:c` вызывает `make lint`. Лог Windows-прогона — `build/c-lint.log`.

## Что внутри

```
src/gfx      фреймбуфер 1024 байта в раскладке SSD1309, линии, прямоугольники, текст UTF-8
src/fonts    шрифт 5×7 (ASCII + А–я, Ёё, °) и иконки — генерируются tools/gen_font.py
src/menu     движок меню: подменю, экраны, переключатели, значения, выбор, прокрутка
src/app      экраны и настройки, строки RU/EN
src/hal      display.h: ssd1309/ — для платы, web/ — для эмулятора
web/         страница эмулятора (canvas, кнопки ▲ ▼ OK ◄, клавиатура)
tests/       unit (свой мини-раннер) и e2e (Playwright)
docs/        план, журнал, отчёт по ДЗ
```

Экраны: **главное меню** → «Показания» (температура крупно, влажность, батарея),
«Настройки» (автосон, яркость = контраст SSD1309, язык RU/EN, инверсия, сброс),
«Символы» (вся таблица шрифта), «Об устройстве».

## Как агент работает в проекте

Проект настроен под **Claude Code** и **Codex** одновременно. Источник правды для инструкций —
`AGENTS.md` и папка `.claude/`; для Codex `npm run sync:agents` раскладывает навыки и правила
в его форматы (CI проверяет, что копии не разошлись).

### Какие инструкции он читает

| Файл                                | Кто читает                | Когда                                   |
| ----------------------------------- | ------------------------- | --------------------------------------- |
| `AGENTS.md`                         | Codex, Claude Code (через `CLAUDE.md`) | всегда: стек, команды, конвенции, запреты |
| `.claude/rules/firmware.md`         | Claude Code               | только при работе с `src/**/*.c,h`      |
| `.claude/rules/web.md`              | Claude Code               | только при работе с `web/**`, `tests/e2e/**` |
| `src/AGENTS.md`, `web/AGENTS.md`, `tests/e2e/AGENTS.md` | Codex | только внутри соответствующих папок |
| `.claude/skills/*`, `.agents/skills/*` | Claude Code / Codex    | навыки (см. ниже)                       |
| `docs/plan.md`, `docs/memory.md`    | оба                       | в начале и в конце каждой сессии        |

Навыки:

- `add-menu-screen` — агент вызывает сам: новый экран/пункт меню со строками, тестами и e2e;
- `check-ui` — агент вызывает сам: проверка эмулятора в браузере через Playwright MCP;
- `release` — только вручную: `/release 0.2.0` в Claude Code, `$release` в Codex.
  Готовит версию, журнал и коммит в `feat/*` или `fix/*`; слияние в `main`, тег
  и публикацию выполняет человек.

### Какие у него права

| Уровень | Claude Code (`.claude/settings.json`) | Codex (`.codex/rules/project.rules`) |
| ------- | ------------------------------------- | ------------------------------------ |
| allow   | `make test/lint/wasm/format`, `npm run test:e2e/lint`, `git add/commit/diff/status`, Playwright MCP | `make test/lint/wasm/format`, `npm run test:e2e/lint/lint:js/check:agents/sync:agents`, `git add/commit/diff/status` через prefix_rule |
| ask     | `git push`, `git tag`, `git reset`, `git rebase`, `npm install` | `git push`, `reset/rebase/tag`, `npm install` → `"prompt"` |
| deny    | чтение `.env*` и `secrets/`, `rm -rf`, `sudo`, `git push --force`, `curl/wget` | `rm -rf`, `cat .env`, `git push --force`, `sudo` → `"forbidden"` |

**Режим по умолчанию:** Claude Code — `acceptEdits`, Codex — `workspace-write` +
`on-request`. Такой выбор позволяет выполнять обычные правки и проверки проекта
в песочнице, сохраняя контроль над расширением доступа.

У Codex песочница и правила команд — разные механизмы. `workspace-write` ограничивает
запись разрешёнными каталогами; проектный конфиг отключает сеть в песочнице.
`on-request` позволяет агенту запросить расширение доступа, когда оно требуется.
Отсутствие команды в allow-списке само по себе не означает обязательного вопроса:
команды внутри песочницы могут выполняться автоматически. Правила `.rules`
управляют запуском команд вне песочницы: `allow` разрешает совпавшую команду
без отдельного вопроса. Явные правила
`prompt` требуют подтверждения, `forbidden` запрещают совпавшую команду;
при нескольких совпадениях действует самое строгое решение. См.
[песочницу и подтверждения](https://learn.chatgpt.com/docs/sandboxing) и
[правила команд](https://learn.chatgpt.com/docs/agent-configuration/rules).

Таблица выше перечисляет примеры из проектных конфигов, а не все возможные способы
доступа. Для Codex запрет чтения `.env` в правилах команд охватывает конкретные
префиксы; hook дополнительно блокирует команды с `.env` и защищённые правки.
Это не файловая изоляция секретов от любого инструмента. AGENTS.md отдельно
запрещает агенту читать, создавать и менять секреты, а также выполнять push:
публикация остаётся человеку даже при наличии ask/prompt в конфиге.
Итоговые права сессии также зависят от доверия проекту, пользовательских
настроек, политик приложения и выданных разрешений.

Личные настройки — в `.claude/settings.local.json` и `CLAUDE.local.md`, они в `.gitignore`.

### Какие проверки его страхуют

- **Hook перед записью** `scripts/hooks/protect-files.mjs` (PreToolUse, оба агента):
  блокирует запись в `.env*`, `.git/`, lock-файлы и сгенерированные файлы шрифта, а также
  shell-команды, которые трогают `.env`.
- **Hook после правки** `scripts/hooks/lint-after-edit.mjs` (PostToolUse, оба агента):
  C → `clang-format -i` + компиляция файла с `-Werror` под wasm32 freestanding (ловит и
  предупреждения, и случайный `#include` из libc); JS/CSS/HTML → Prettier + ESLint.
  Ошибки возвращаются агенту, и он обязан их исправить.
- **Hook начала сессии** `scripts/hooks/session-start.mjs` (Claude Code): подставляет открытые
  пункты плана и последнюю запись журнала — агент продолжает с того места, где остановился.
- **CI** (`.github/workflows/ci.yml`): синхронность инструкций, линтеры, unit и e2e.

### Как запустить тесты

```bash
npm test                       # все unit-тесты, включая Windows с LLVM-MinGW
make test                       # все unit-тесты
make test T=ssd1309             # тесты драйвера дисплея
npm run test:e2e                # e2e в браузере
npx playwright test -g "автосон"  # один e2e-сценарий
npx playwright show-report      # отчёт со скриншотами и трейсами
```

Подробный отчёт по домашнему заданию — [`docs/about.md`](docs/about.md).

## Модуль 2. Агентно-ориентированный пайплайн разработки

Подготовлено 2026-10-22 для существующего OLED-эмулятора. GSD Core **1.18.0** уже
установлен в пользовательском окружении Codex; повторная установка не требовалась.
Discovery выполнен вручную по структуре GSD: пользователь выбрал график температуры
и подтвердил требования. Полный автоматический `$gsd-new-project` не запускался.

| Пункт задания | Результат и доказательство |
| --- | --- |
| GSD и структура проекта | [PROJECT](.planning/PROJECT.md), [требования](.planning/REQUIREMENTS.md), [Roadmap](.planning/ROADMAP.md), [progress / STATE](.planning/STATE.md), [планы](.planning/phases/01-agent-pipeline/01-01-PLAN.md) |
| Architecture и security checklist | [Архитектура](docs/architecture.md), [контроль безопасности](docs/security-checklist.md) |
| Память агента, аналог Claude Mem | STATE + [журнал решений](docs/memory.md) + [чекпойнт](docs/context-checkpoint.md); без внешнего сервиса |
| Быстрые команды и auto hooks | Команды ниже; SessionStart, PreToolUse, PostToolUse и новый PreCompact в Claude Code; [тесты](tests/hooks/agent-workflow.test.mjs) |
| Управление контекстом | Graft, ограниченное восстановление памяти, checkpoint; [демонстрация compact в Codex CLI](docs/context-usage.md): **35.1K → 16.5K токенов (≈53% меньше)**, снимки до/после и проверка сохранения требований |
| Discovery | [Ответы пользователя, решения и критерии](.planning/phases/02-temperature-graph/02-CONTEXT.md), [план первой продуктовой фазы](.planning/phases/02-temperature-graph/02-01-PLAN.md) |

### Воспроизведение

```bash
npm run agent:doctor       # Node, установка GSD, обязательные документы
npm run gsd:check          # проверка структуры .planning средствами GSD Core
npm run gsd:progress       # фактические планы и SUMMARY по фазам
npm run agent:resume       # компактный пакет для новой сессии
npm run agent:checkpoint   # сохранить docs/context-checkpoint.md
npm run test:hooks         # проверки памяти, защиты и автолинтера
```

GSD не является npm-зависимостью приложения и не включается в lock-файл. Команды
ищут `gsd-core/bin/gsd-tools.cjs` в `CODEX_HOME`, затем в `~/.codex` и `~/.claude`.
На другом компьютере нужен установленный GSD Core; отсутствие установки сообщает doctor.
Версия текущей установки и результаты проверок приведены в [отчёте модуля](docs/module-2.md).

В Codex доступны навыки `$gsd-progress`, `$gsd-plan-phase`, `$gsd-execute-phase`,
`$gsd-pause-work` и `$gsd-resume-work`. Созданные здесь документы — адаптация для
существующего проекта; наличие навыка не означает, что его workflow уже выполнен.

Цикл: **Discovery → требования → план → реализация → lint/unit/e2e → проверка
человеком → SUMMARY и память → checkpoint**. Хуки Claude Code загружаются в
доверенном проекте; перед демонстрацией проверить `/hooks`. В Codex переносимая
память доступна через npm-команды; новый PreCompact подключён только в Claude Code.

Для графика согласованы 64 замера с частотой 1 Гц, RAM, автоподбор Y, текущее
значение, RU/EN и BACK. Его реализация ещё не начата. Пользовательская проверка
управления контекстом завершена: [результаты](.planning/phases/01-agent-pipeline/01-02-SUMMARY.md).

Снимки сделаны в одной сессии Codex CLI v0.163.0-alpha.11.1, GPT-6.1-Sol high:
`/status` → `/compact` → `/status`. Сравнивается строка `Context window`,
а не квота аккаунта. После compact агент повторил требования без чтения файлов.

![Контекст до сжатия: 35.1K used](docs/screenshots/context-usage-before.png)

![Контекст после сжатия: 16.5K used](docs/screenshots/context-usage-after.png)

[Проверка сохранения требований после сжатия](docs/screenshots/context-retained.png).
