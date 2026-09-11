// Cloudflare a veces tarda en reconocer la fecha de "hoy" como compatibility_date
// válida, lo que hace fallar `npx nitro deploy --prebuilt` con el error
// "Can't set compatibility date in the future". Este script fija una fecha
// segura (siempre en el pasado) en el wrangler.json que genera el build,
// justo antes de desplegar.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SAFE_COMPAT_DATE = "2025-09-01";
const path = join(process.cwd(), ".output", "server", "wrangler.json");

const config = JSON.parse(readFileSync(path, "utf8"));
const previous = config.compatibility_date;
config.compatibility_date = SAFE_COMPAT_DATE;
writeFileSync(path, JSON.stringify(config, null, 2));

console.log(`compatibility_date: "${previous}" -> "${SAFE_COMPAT_DATE}" (${path})`);
