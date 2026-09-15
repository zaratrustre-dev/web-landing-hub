import * as XLSX from "xlsx";

import {
  createUser,
  deleteUser,
  fetchAllAdminEmails,
  updateProfileAdmin,
  updateProfilePhoto,
  uploadProfilePhoto,
} from "./admin";
import { COUNTRIES } from "./countries";

// ---------------------------------------------------------------------------
// Importacion masiva de usuarios de prueba/demo desde un Excel (panel admin,
// seccion Usuarios). Los usuarios creados aqui NUNCA inician sesion (no hay
// forma de loguearse sin Google OAuth real) - son solo para poblar el
// directorio en pruebas/demos. Ver ARCHITECTURE.md para el contexto de la
// FK profiles.id -> auth.users.
// ---------------------------------------------------------------------------

export const ROLE_VALUES = [
  "developer",
  "designer",
  "entrepreneur",
  "marketing",
  "consultant",
  "lender",
  "logistics",
  "recruiter",
  "influencer",
] as const;

const ROLE_SET = new Set<string>(ROLE_VALUES);

// Mapeo de nombres de pais en espanol (como los escribiria un usuario
// hispanohablante en un Excel) al nombre EXACTO en ingles que usa el
// desplegable "Pais" del panel admin y de mobile (src/lib/countries.ts /
// mobile/constants/countries.ts). Las claves estan normalizadas: minusculas,
// sin tildes/enes. Generado a partir de los 194 paises de COUNTRIES; cubre
// los nombres en espanol mas comunes. Si un pais del Excel no aparece aqui,
// se rechaza la fila explicitamente en vez de adivinar (ver normalizeCountry).
export const ES_TO_EN_COUNTRY: Record<string, string> = {
  "afganistan": "Afghanistan",
  "albania": "Albania",
  "alemania": "Germany",
  "andorra": "Andorra",
  "angola": "Angola",
  "antigua y barbuda": "Antigua and Barbuda",
  "arabia saudi": "Saudi Arabia",
  "arabia saudita": "Saudi Arabia",
  "argelia": "Algeria",
  "argentina": "Argentina",
  "armenia": "Armenia",
  "australia": "Australia",
  "austria": "Austria",
  "azerbaiyan": "Azerbaijan",
  "bahamas": "Bahamas",
  "bahrein": "Bahrain",
  "bangladesh": "Bangladesh",
  "barbados": "Barbados",
  "barein": "Bahrain",
  "belgica": "Belgium",
  "belice": "Belize",
  "benin": "Benin",
  "bielorrusia": "Belarus",
  "birmania": "Myanmar",
  "bolivia": "Bolivia",
  "bosnia": "Bosnia and Herzegovina",
  "bosnia y herzegovina": "Bosnia and Herzegovina",
  "botsuana": "Botswana",
  "brasil": "Brazil",
  "brunei": "Brunei",
  "bulgaria": "Bulgaria",
  "burkina faso": "Burkina Faso",
  "burundi": "Burundi",
  "butan": "Bhutan",
  "cabo verde": "Cape Verde",
  "camboya": "Cambodia",
  "camerun": "Cameroon",
  "canada": "Canada",
  "catar": "Qatar",
  "chad": "Chad",
  "chequia": "Czech Republic",
  "chile": "Chile",
  "china": "China",
  "chipre": "Cyprus",
  "ciudad del vaticano": "Vatican City",
  "colombia": "Colombia",
  "comoras": "Comoros",
  "congo": "Republic of the Congo",
  "congo (rd)": "Democratic Republic of the Congo",
  "corea del norte": "North Korea",
  "corea del sur": "South Korea",
  "costa de marfil": "Ivory Coast",
  "costa rica": "Costa Rica",
  "croacia": "Croatia",
  "cuba": "Cuba",
  "dinamarca": "Denmark",
  "dominica": "Dominica",
  "ecuador": "Ecuador",
  "ee.uu.": "United States",
  "eeuu": "United States",
  "egipto": "Egypt",
  "el salvador": "El Salvador",
  "emiratos arabes unidos": "United Arab Emirates",
  "eritrea": "Eritrea",
  "eslovaquia": "Slovakia",
  "eslovenia": "Slovenia",
  "espana": "Spain",
  "estados unidos": "United States",
  "estonia": "Estonia",
  "esuatini": "Eswatini",
  "etiopia": "Ethiopia",
  "filipinas": "Philippines",
  "finlandia": "Finland",
  "fiyi": "Fiji",
  "francia": "France",
  "gabon": "Gabon",
  "gambia": "Gambia",
  "georgia": "Georgia",
  "ghana": "Ghana",
  "granada": "Grenada",
  "grecia": "Greece",
  "guatemala": "Guatemala",
  "guinea": "Guinea",
  "guinea bisau": "Guinea-Bissau",
  "guinea ecuatorial": "Equatorial Guinea",
  "guinea-bisau": "Guinea-Bissau",
  "guyana": "Guyana",
  "haiti": "Haiti",
  "holanda": "Netherlands",
  "honduras": "Honduras",
  "hungria": "Hungary",
  "india": "India",
  "indonesia": "Indonesia",
  "irak": "Iraq",
  "iran": "Iran",
  "iraq": "Iraq",
  "irlanda": "Ireland",
  "islandia": "Iceland",
  "islas marshall": "Marshall Islands",
  "islas salomon": "Solomon Islands",
  "israel": "Israel",
  "italia": "Italy",
  "jamaica": "Jamaica",
  "japon": "Japan",
  "jordania": "Jordan",
  "kazajistan": "Kazakhstan",
  "kenia": "Kenya",
  "kirguistan": "Kyrgyzstan",
  "kiribati": "Kiribati",
  "kuwait": "Kuwait",
  "laos": "Laos",
  "lesoto": "Lesotho",
  "letonia": "Latvia",
  "libano": "Lebanon",
  "liberia": "Liberia",
  "libia": "Libya",
  "liechtenstein": "Liechtenstein",
  "lituania": "Lithuania",
  "luxemburgo": "Luxembourg",
  "macedonia del norte": "North Macedonia",
  "madagascar": "Madagascar",
  "malasia": "Malaysia",
  "malaui": "Malawi",
  "malawi": "Malawi",
  "maldivas": "Maldives",
  "mali": "Mali",
  "malta": "Malta",
  "marruecos": "Morocco",
  "mauricio": "Mauritius",
  "mauritania": "Mauritania",
  "mexico": "Mexico",
  "micronesia": "Micronesia",
  "moldavia": "Moldova",
  "monaco": "Monaco",
  "mongolia": "Mongolia",
  "montenegro": "Montenegro",
  "mozambique": "Mozambique",
  "myanmar": "Myanmar",
  "namibia": "Namibia",
  "nauru": "Nauru",
  "nepal": "Nepal",
  "nicaragua": "Nicaragua",
  "niger": "Niger",
  "nigeria": "Nigeria",
  "noruega": "Norway",
  "nueva zelanda": "New Zealand",
  "oman": "Oman",
  "paises bajos": "Netherlands",
  "pakistan": "Pakistan",
  "palaos": "Palau",
  "panama": "Panama",
  "papua nueva guinea": "Papua New Guinea",
  "paraguay": "Paraguay",
  "peru": "Peru",
  "polonia": "Poland",
  "portugal": "Portugal",
  "qatar": "Qatar",
  "reino unido": "United Kingdom",
  "republica centroafricana": "Central African Republic",
  "republica checa": "Czech Republic",
  "republica del congo": "Republic of the Congo",
  "republica democratica del congo": "Democratic Republic of the Congo",
  "republica dominicana": "Dominican Republic",
  "ruanda": "Rwanda",
  "rumania": "Romania",
  "rusia": "Russia",
  "samoa": "Samoa",
  "san cristobal y nieves": "Saint Kitts and Nevis",
  "san marino": "San Marino",
  "san vicente y las granadinas": "Saint Vincent and the Grenadines",
  "santa lucia": "Saint Lucia",
  "santo tome y principe": "São Tomé and Príncipe",
  "senegal": "Senegal",
  "serbia": "Serbia",
  "seychelles": "Seychelles",
  "sierra leona": "Sierra Leone",
  "singapur": "Singapore",
  "siria": "Syria",
  "somalia": "Somalia",
  "sri lanka": "Sri Lanka",
  "suazilandia": "Eswatini",
  "sudafrica": "South Africa",
  "sudan": "Sudan",
  "sudan del sur": "South Sudan",
  "suecia": "Sweden",
  "suiza": "Switzerland",
  "surinam": "Suriname",
  "tailandia": "Thailand",
  "tanzania": "Tanzania",
  "tayikistan": "Tajikistan",
  "timor oriental": "Timor-Leste",
  "togo": "Togo",
  "tonga": "Tonga",
  "trinidad y tobago": "Trinidad and Tobago",
  "tunez": "Tunisia",
  "turkmenistan": "Turkmenistan",
  "turquia": "Turkey",
  "tuvalu": "Tuvalu",
  "ucrania": "Ukraine",
  "uganda": "Uganda",
  "uruguay": "Uruguay",
  "uzbekistan": "Uzbekistan",
  "vanuatu": "Vanuatu",
  "vaticano": "Vatican City",
  "venezuela": "Venezuela",
  "vietnam": "Vietnam",
  "yemen": "Yemen",
  "yibuti": "Djibouti",
  "zambia": "Zambia",
  "zimbabue": "Zimbabwe",
  "zimbabwe": "Zimbabwe",
};

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Algunos Excels exportados desde Google Sheets guardan la columna Foto como
// texto literal =IMAGE("url") en vez de una URL simple (IMAGE() no existe en
// Excel de verdad, así que nunca es una fórmula real, solo texto con esa
// forma). Si detectamos ese patrón, extraemos la URL de dentro de las comillas.
const IMAGE_FORMULA_RE = /^=?\s*IMAGE\(\s*"([^"]+)"\s*\)$/i;

function extractPhotoUrl(raw: string): string | null {
  if (!raw) return null;
  const match = raw.match(IMAGE_FORMULA_RE);
  return match ? match[1] : raw;
}

function normalizeCountryKey(s: string): string {
  return stripAccents(s.toLowerCase()).replace(/\s+/g, " ").trim();
}

/**
 * Convierte lo que venga en la columna "Pais" (espanol o ingles) al nombre
 * exacto usado en COUNTRIES. Devuelve null si no lo reconoce - en ese caso
 * la fila se rechaza, nunca se adivina un valor aproximado.
 */
export function normalizeCountry(raw: string): string | null {
  const trimmed = raw.trim();
  if (COUNTRIES.includes(trimmed)) return trimmed;
  const mapped = ES_TO_EN_COUNTRY[normalizeCountryKey(trimmed)];
  if (mapped && COUNTRIES.includes(mapped)) return mapped;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Alias de cabecera aceptados (normalizados: minusculas, sin tildes) -> clave interna.
const HEADER_ALIASES: Record<string, string> = {
  foto: "foto",
  photo: "foto",
  email: "email",
  correo: "email",
  "e-mail": "email",
  nombre: "nombre",
  name: "nombre",
  edad: "edad",
  age: "edad",
  pais: "pais",
  country: "pais",
  rol: "rol",
  role: "rol",
  "rol buscado": "rol_buscado",
  "rolbuscado": "rol_buscado",
  role_sought: "rol_buscado",
  "role sought": "rol_buscado",
  profesion: "profesion",
  profession: "profesion",
  portafolio: "portafolio",
  portfolio: "portafolio",
  descripcion: "descripcion",
  description: "descripcion",
};

function normalizeHeader(h: string): string {
  return stripAccents(String(h ?? "").trim().toLowerCase());
}

export interface ImportRow {
  rowNumber: number; // fila real del Excel (la cabecera es la fila 1)
  email: string;
  name: string;
  age: number;
  country: string; // ya normalizado al nombre en ingles de COUNTRIES
  role: string;
  roleSought: string;
  profession: string;
  portfolioUrl: string | null;
  description: string | null;
  photoUrl: string | null; // URL externa a descargar (puede ser null)
}

export interface ImportRowError {
  rowNumber: number;
  rawEmail: string | null;
  messages: string[];
}

export interface ParseResult {
  validRows: ImportRow[];
  errors: ImportRowError[];
}

/**
 * Lee el archivo .xlsx en el navegador y valida cada fila contra las
 * restricciones reales de la tabla profiles (edad 18-120, profesion <=20
 * caracteres, descripcion <=200, rol dentro del enum, pais reconocible).
 * No crea nada todavia - solo valida. Si CUALQUIER fila tiene errores, el
 * import completo debe bloquearse (lo decide quien llama a esta funcion,
 * mostrando errors y dejando validRows sin usar).
 */
export async function parseUsersExcelFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      validRows: [],
      errors: [{ rowNumber: 0, rawEmail: null, messages: ["El archivo no tiene ninguna hoja."] }],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  if (raw.length < 2) {
    return {
      validRows: [],
      errors: [{ rowNumber: 0, rawEmail: null, messages: ["El archivo no tiene filas de datos."] }],
    };
  }

  const headerRow = raw[0] as unknown[];
  const colIndex: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    const key = HEADER_ALIASES[normalizeHeader(String(h ?? ""))];
    if (key) colIndex[key] = i;
  });

  const requiredCols = ["email", "nombre", "edad", "pais", "rol", "rol_buscado", "profesion"];
  const missingCols = requiredCols.filter((c) => !(c in colIndex));
  if (missingCols.length > 0) {
    return {
      validRows: [],
      errors: [
        {
          rowNumber: 0,
          rawEmail: null,
          messages: [
            `Faltan columnas obligatorias en el Excel: ${missingCols.join(", ")}. Cabeceras esperadas: Email, Nombre, Edad, Pais, Rol, Rol Buscado, Profesion (Foto, Portafolio y Descripcion son opcionales).`,
          ],
        },
      ],
    };
  }

  const validRows: ImportRow[] = [];
  const errors: ImportRowError[] = [];
  const seenEmails = new Map<string, number>();

  for (let i = 1; i < raw.length; i++) {
    const dataRow = raw[i] as unknown[];
    const rowNumber = i + 1;
    if (!dataRow || dataRow.every((v) => v === "" || v === null || v === undefined)) continue;

    const get = (col: string): string => {
      const idx = colIndex[col];
      const v = idx !== undefined ? dataRow[idx] : "";
      if (v === null || v === undefined) return "";
      return String(v).trim();
    };

    const messages: string[] = [];

    const rawEmail = get("email");
    const emailKey = rawEmail.toLowerCase();
    if (!rawEmail) {
      messages.push("Email vacio.");
    } else if (!EMAIL_RE.test(rawEmail)) {
      messages.push(`Email con formato invalido: "${rawEmail}".`);
    } else if (seenEmails.has(emailKey)) {
      messages.push(
        `Email duplicado dentro del propio archivo (tambien en la fila ${seenEmails.get(emailKey)}).`,
      );
    } else {
      seenEmails.set(emailKey, rowNumber);
    }

    const name = get("nombre");
    if (!name) messages.push("Nombre vacio.");

    const ageRaw = get("edad");
    const age = Number(ageRaw);
    if (!ageRaw || !Number.isFinite(age) || !Number.isInteger(age)) {
      messages.push(`Edad invalida: "${ageRaw}".`);
    } else if (age < 18 || age > 120) {
      messages.push(`Edad fuera de rango (18-120): ${age}.`);
    }

    const countryRaw = get("pais");
    let country: string | null = null;
    if (!countryRaw) {
      messages.push("Pais vacio.");
    } else {
      country = normalizeCountry(countryRaw);
      if (!country) {
        messages.push(
          `Pais no reconocido: "${countryRaw}". Usa el nombre habitual en espanol (ej. "Espana", "Mexico") o el nombre exacto en ingles del desplegable.`,
        );
      }
    }

    const roleRaw = get("rol").toLowerCase();
    if (!roleRaw) {
      messages.push("Rol vacio.");
    } else if (!ROLE_SET.has(roleRaw)) {
      messages.push(`Rol no reconocido: "${roleRaw}". Debe ser uno de: ${ROLE_VALUES.join(", ")}.`);
    }

    // Obligatoria (ver ARCHITECTURE.md, gotcha "role_sought y onboarding_completed"):
    // el trigger compute_onboarding_completed() de la base de datos recalcula
    // onboarding_completed en cada insert/update y lo pone en false si falta
    // role_sought, sin importar lo que mande este importador - un perfil sin
    // esta columna queda invisible para Discovery y para el filtro de Rol del
    // buscador admin, aunque el resto de datos este completo.
    const roleSoughtRaw = get("rol_buscado").toLowerCase();
    if (!roleSoughtRaw) {
      messages.push("Rol buscado vacio.");
    } else if (!ROLE_SET.has(roleSoughtRaw)) {
      messages.push(
        `Rol buscado no reconocido: "${roleSoughtRaw}". Debe ser uno de: ${ROLE_VALUES.join(", ")}.`,
      );
    }

    const profession = get("profesion");
    if (!profession) {
      messages.push("Profesion vacia.");
    } else if (profession.length > 20) {
      messages.push(
        `Profesion demasiado larga (${profession.length}/20 caracteres): "${profession}".`,
      );
    }

    const description = get("descripcion") || null;
    if (description && description.length > 200) {
      messages.push(`Descripcion demasiado larga (${description.length}/200 caracteres).`);
    }

    const portfolioUrl = get("portafolio") || null;
    const photoUrl = extractPhotoUrl(get("foto"));

    if (messages.length > 0) {
      errors.push({ rowNumber, rawEmail: rawEmail || null, messages });
      continue;
    }

    validRows.push({
      rowNumber,
      email: rawEmail,
      name,
      age,
      country: country as string,
      role: roleRaw,
      roleSought: roleSoughtRaw,
      profession,
      portfolioUrl,
      description,
      photoUrl,
    });
  }

  return { validRows, errors };
}

/**
 * Comprueba duplicados contra la base de datos real (no solo dentro del
 * archivo), ANTES de crear nada. Si hay conflictos, el import se debe
 * abortar sin efectos secundarios (nada se ha creado todavia).
 */
export async function checkExistingEmails(rows: ImportRow[]): Promise<ImportRowError[]> {
  if (rows.length === 0) return [];
  const existingEmails = await fetchAllAdminEmails();
  const existingSet = new Set(existingEmails.map((e) => e.toLowerCase()));

  const conflicts: ImportRowError[] = [];
  for (const row of rows) {
    if (existingSet.has(row.email.toLowerCase())) {
      conflicts.push({
        rowNumber: row.rowNumber,
        rawEmail: row.email,
        messages: [`Ya existe un usuario con el email "${row.email}" en la base de datos.`],
      });
    }
  }
  return conflicts;
}

export interface ImportProgress {
  total: number;
  done: number;
  currentEmail: string;
}

export interface ImportOutcome {
  success: boolean;
  importedCount: number;
  failedRow?: { rowNumber: number; email: string; message: string };
  rolledBackCount?: number;
  rollbackErrors?: string[];
}

/**
 * Descarga la imagen de una URL externa (ej. avatar de dicebear) y la
 * devuelve como File, lista para uploadProfilePhoto(). No convierte el
 * formato: si el origen es SVG se sube como SVG.
 */
async function fetchImageAsFile(url: string, filenameHint: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo descargar la foto (HTTP ${res.status}): ${url}`);
  }
  const blob = await res.blob();
  const contentType = blob.type || res.headers.get("content-type") || "image/png";
  const ext = contentType.includes("svg")
    ? "svg"
    : contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
  return new File([blob], `${filenameHint}.${ext}`, { type: contentType });
}

/**
 * Ejecuta la importacion: crea cada usuario + descarga y sube su foto +
 * marca el perfil como completo, fila a fila. Si cualquier fila falla en
 * cualquier paso, revierte (borra) todos los usuarios ya creados en este
 * mismo lote - el import es todo-o-nada, nunca deja resultados parciales.
 */
export async function runBulkImport(
  rows: ImportRow[],
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportOutcome> {
  const createdIds: { id: string; email: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    onProgress?.({ total: rows.length, done: i, currentEmail: row.email });

    try {
      const result = await createUser({
        email: row.email,
        name: row.name,
        age: row.age,
        role: row.role,
        role_sought: row.roleSought,
        profession: row.profession,
        description: row.description ?? undefined,
        portfolio_url: row.portfolioUrl ?? undefined,
        country: row.country,
      });
      const newUserId = (result as { user_id?: string } | null)?.user_id;
      if (!newUserId) throw new Error("La creacion no devolvio un user_id.");
      createdIds.push({ id: newUserId, email: row.email });

      if (row.photoUrl) {
        const file = await fetchImageAsFile(row.photoUrl, `import-${newUserId}`);
        const publicUrl = await uploadProfilePhoto(newUserId, file);
        await updateProfilePhoto(newUserId, publicUrl);
      }

      await updateProfileAdmin(newUserId, { onboarding_completed: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";

      const rollbackErrors: string[] = [];
      for (const created of createdIds) {
        try {
          await deleteUser(created.id);
        } catch (rollbackErr) {
          rollbackErrors.push(
            `No se pudo revertir ${created.email} (${created.id}): ${
              rollbackErr instanceof Error ? rollbackErr.message : "error desconocido"
            }`,
          );
        }
      }

      return {
        success: false,
        importedCount: 0,
        failedRow: { rowNumber: row.rowNumber, email: row.email, message },
        rolledBackCount: createdIds.length - rollbackErrors.length,
        rollbackErrors: rollbackErrors.length > 0 ? rollbackErrors : undefined,
      };
    }
  }

  onProgress?.({ total: rows.length, done: rows.length, currentEmail: "" });
  return { success: true, importedCount: rows.length };
}
