import { readEvents } from "../events/log.js";
import { filterWindow, summarize, type ReportWindow } from "./summarize.js";

const arg = (process.argv[2] ?? "session").toLowerCase();
const window: ReportWindow = arg === "today" || arg === "week" ? arg : "session";
process.stdout.write(summarize(filterWindow(readEvents(), window)) + "\n");
