// PreCompact (Claude Code): сохраняет переносимый контекст, не читая транскрипт чата.
import { saveCheckpoint } from "../agent-workflow.mjs";
import { projectRoot, readHookInput } from "./lib.mjs";

const input = await readHookInput();
saveCheckpoint(projectRoot(input));
