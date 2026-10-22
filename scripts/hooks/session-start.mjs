#!/usr/bin/env node
// SessionStart (Claude Code): подмешивает в контекст новой сессии открытые пункты
// docs/plan.md и последнюю запись docs/memory.md — агент продолжает работу, а не начинает с нуля.
import { buildContext } from "../agent-workflow.mjs";
import { projectRoot, readHookInput } from "./lib.mjs";

const input = await readHookInput().catch(() => ({}));
process.stdout.write(buildContext(projectRoot(input)));
