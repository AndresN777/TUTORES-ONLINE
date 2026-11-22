// Builds manual-de-usuario.html (project root) from docs/manual/manual.template.html,
// embedding every screenshot as a data URI so the manual is a single portable file.
// Usage: npm run docs:manual
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const template = readFileSync(path.join(root, "docs/manual/manual.template.html"), "utf8");
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

let count = 0;
const html = template.replace(/src="(docs\/manual\/img\/[^"]+)"/g, (_, rel) => {
  const mime = MIME[path.extname(rel).toLowerCase()];
  if (!mime) throw new Error(`Tipo de imagen no soportado: ${rel}`);
  count += 1;
  return `src="data:${mime};base64,${readFileSync(path.join(root, rel)).toString("base64")}"`;
});

writeFileSync(path.join(root, "manual-de-usuario.html"), html);
console.info(`manual-de-usuario.html generado con ${count} capturas incrustadas.`);
