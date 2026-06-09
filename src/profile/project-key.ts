import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

/** Stable per-project key: nearest ancestor dir containing `.git`, else cwd. No git spawn. */
export function projectKey(cwd: string = process.cwd()): string {
  try {
    let dir = resolve(cwd);
    for (;;) {
      if (existsSync(join(dir, ".git"))) return dir;
      const parent = dirname(dir);
      if (parent === dir) return resolve(cwd); // reached fs root
      dir = parent;
    }
  } catch {
    return resolve(cwd);
  }
}
