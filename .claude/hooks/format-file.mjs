#!/usr/bin/env node
// PostToolUse hook: formatea con Prettier y, si aplica, corrige con ESLint el
// archivo que Claude Code acaba de crear o editar (Write | Edit | MultiEdit).
//
// Claude pasa por stdin un JSON con la forma { tool_input: { file_path }, ... }.
// Es best-effort: nunca aborta el flujo de Claude (siempre termina con exit 0).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
const LINT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}
// Resuelve el binario local (.cmd en Windows) para no depender de npx/global.
function localBin(name) {
  const binDir = join(process.cwd(), "node_modules", ".bin");
  const win = join(binDir, `${name}.cmd`);
  return process.platform === "win32" && existsSync(win)
    ? win
    : join(binDir, name);
}
function run(bin, args) {
  const result = spawnSync(bin, args, {
    stdio: ["ignore", "inherit", "inherit"],
    shell: process.platform === "win32", // .cmd requiere shell en Windows
  });
  return result.status === 0;
}
// Deja solo el código: quita espacios finales de cada línea y elimina las
// líneas en blanco (o que solo tengan espacios). Conserva el salto final.
function stripBlankLines(filePath) {
  const source = readFileSync(filePath, "utf8");
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.length > 0);
  writeFileSync(filePath, lines.join(eol) + eol);
}
async function main() {
  const raw = await readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return; // sin JSON válido no hay nada que formatear
  }
  const filePath = payload?.tool_input?.file_path;
  if (!filePath || !existsSync(filePath)) return;
  // Prettier formatea todo lo que entienda; --ignore-unknown omite el resto.
  run(localBin("prettier"), ["--write", "--ignore-unknown", filePath]);
  // ESLint --fix solo para archivos de JS/TS.
  if (LINT_EXTENSIONS.has(extname(filePath).toLowerCase())) {
    run(localBin("eslint"), ["--fix", filePath]);
    // Último paso: dejar el código conciso quitando líneas en blanco. Se hace
    // tras Prettier/ESLint porque ninguno vuelve a insertar líneas vacías, así
    // el resultado es estable. Solo para código JS/TS (en Markdown/JSON las
    // líneas en blanco sí son significativas).
    stripBlankLines(filePath);
  }
}
main().finally(() => process.exit(0));
