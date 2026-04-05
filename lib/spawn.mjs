import { spawn } from "node:child_process";

export function runInWorkspace(cwd, command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let out = "";
    let err = "";
    child.stdout?.on("data", (c) => (out += c));
    child.stderr?.on("data", (c) => (err += c));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, out, err }));
  });
}
