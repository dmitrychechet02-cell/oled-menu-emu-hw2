# AGENTS.md

## Проект и стек

Эмулятор меню для монохромного OLED 128×64 2.42" (контроллер SSD1309). Ядро на C11 без libc
(графика, шрифт 5×7 RU/EN, движок меню, экраны) собирается в WebAssembly для браузера и в
обычный бинарник для unit-тестов; тот же код без изменений переносится на микроконтроллер.
Стек: C11 + clang (wasm32) + gcc (тесты) + Make; веб — чистый JS (ES-модули) без фреймворков;
тесты — собственный раннер `tests/unit/tt.h` и Playwright; линтеры — clang-format, `-Werror`,
ESLint, Prettier; менеджер пакетов — npm.

## Команды

| Что                          | Команда                              |
| ---------------------------- | ------------------------------------ |
| Установка                    | `npm install && npx playwright install chromium` |
| Собрать эмулятор (wasm)      | `make wasm`                          |
| Запустить эмулятор           | `npm start` → http://localhost:8080  |
| Все unit-тесты               | `make test`                          |
| Один unit-тест (по подстроке)| `make test T=menu_value_edit`        |
| E2E-тесты                    | `npm run test:e2e`                   |
| Один e2e-тест                | `npx playwright test -g "автосон"`   |
| Линтер C (формат + сборка)   | `make lint`                          |
| Линтер всего проекта         | `npm run lint`                       |
| Автоформат                   | `npm run format`                     |
| Перегенерировать шрифт       | `make fonts`                         |

Готово = `make lint && make test && npm run test:e2e` проходят.

## Конвенции

- Структура: `src/gfx` — фреймбуфер и примитивы; `src/fonts` — шрифт и иконки (данные
  генерируются `tools/gen_font.py`); `src/menu` — движок меню; `src/app` — экраны, строки,
  настройки; `src/hal` — дисплей (`ssd1309/` для платы, `web/` для эмулятора);
  `web/` — страница эмулятора; `tests/unit`, `tests/e2e` — тесты; `docs/` — план и память.
- Имена в C: `модуль_действие` (`gfx_fill_rect`, `menu_handle_key`), типы `*_t`,
  макросы и enum — `UPPER_CASE` с префиксом модуля. Файлы — `snake_case`.
- Строки интерфейса — только через `tr(STR_*)` в `src/app/i18n.c`, обе локали сразу.
- Комментарии и сообщения коммитов — на русском.
- Формат C — `.clang-format` (4 пробела, 100 колонок); JS — Prettier (100 колонок).
- Для правил по конкретным папкам см. `src/AGENTS.md` и `web/AGENTS.md`
  (для Claude Code — `.claude/rules/`).

## Правила работы

- Ветки: `main` защищена, работа в `feat/<кратко>` или `fix/<кратко>`.
- Коммиты: Conventional Commits на русском (`feat(menu): прокрутка длинных списков`).
  Перед коммитом — `make lint && make test`.
- Новая логика в `src/` — сразу с unit-тестом; новое поведение UI — с шагом в e2e.
- Память между сессиями: в начале сессии прочитай `docs/plan.md` и последнюю запись
  `docs/memory.md`; в конце — отметь пункты плана и допиши запись в журнал
  (сделано / решение / дальше / ловушки).

### Агенту запрещено

- Читать и менять `.env`, `.env.local` и любые секреты; создавать их тоже нельзя.
- Править `.git/`, lock-файлы (`package-lock.json`) и сгенерированные
  `src/fonts/font5x7_data.c`, `src/fonts/icons_data.c`, `src/fonts/icons.h` —
  меняй `tools/gen_font.py` и запускай `make fonts`.
- `git push`, `git push --force`, `git reset --hard`, `rm -rf` — только человек.
- Ослаблять проверки: отключать `-Werror`, удалять или пропускать тесты, чтобы «позеленело».
- Подключать в ядро сторонние библиотеки и libc.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
