import { readEvents } from "../events/log.js";
import { filterWindow, summarize } from "./summarize.js";
const arg = (process.argv[2] ?? "session").toLowerCase();
const window = arg === "today" || arg === "week" ? arg : "session";
process.stdout.write(summarize(filterWindow(readEvents(), window)) + "\n");
