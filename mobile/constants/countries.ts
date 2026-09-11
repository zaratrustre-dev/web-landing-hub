// Mapeo de código de región ISO 3166-1 alpha-2 (el que devuelve
// expo-localization según la configuración regional del dispositivo) al
// nombre de país en español. Debe coincidir EXACTAMENTE con los valores de
// src/lib/countries.ts (panel admin) para que el campo profiles.country
// tenga siempre el mismo formato venga de donde venga.
export const ISO_TO_SPANISH_COUNTRY: Record<string, string> = {
  AF: "Afganistán", AL: "Albania", DE: "Alemania", AD: "Andorra", AO: "Angola",
  AG: "Antigua y Barbuda", SA: "Arabia Saudita", DZ: "Argelia", AR: "Argentina",
  AM: "Armenia", AU: "Australia", AT: "Austria", AZ: "Azerbaiyán", BS: "Bahamas",
  BD: "Bangladés", BB: "Barbados", BH: "Baréin", BE: "Bélgica", BZ: "Belice",
  BJ: "Benín", BY: "Bielorrusia", MM: "Birmania", BO: "Bolivia",
  BA: "Bosnia y Herzegovina", BW: "Botsuana", BR: "Brasil", BN: "Brunéi",
  BG: "Bulgaria", BF: "Burkina Faso", BI: "Burundi", BT: "Bután",
  CV: "Cabo Verde", KH: "Camboya", CM: "Camerún", CA: "Canadá", QA: "Catar",
  TD: "Chad", CL: "Chile", CN: "China", CY: "Chipre", VA: "Ciudad del Vaticano",
  CO: "Colombia", KM: "Comoras", KP: "Corea del Norte", KR: "Corea del Sur",
  CI: "Costa de Marfil", CR: "Costa Rica", HR: "Croacia", CU: "Cuba",
  DK: "Dinamarca", DM: "Dominica", EC: "Ecuador", EG: "Egipto",
  SV: "El Salvador", AE: "Emiratos Árabes Unidos", ER: "Eritrea",
  SK: "Eslovaquia", SI: "Eslovenia", ES: "España", US: "Estados Unidos",
  EE: "Estonia", SZ: "Esuatini", ET: "Etiopía", PH: "Filipinas",
  FI: "Finlandia", FJ: "Fiyi", FR: "Francia", GA: "Gabón", GM: "Gambia",
  GE: "Georgia", GH: "Ghana", GD: "Granada", GR: "Grecia", GT: "Guatemala",
  GN: "Guinea", GW: "Guinea-Bisáu", GQ: "Guinea Ecuatorial", GY: "Guyana",
  HT: "Haití", HN: "Honduras", HU: "Hungría", IN: "India", ID: "Indonesia",
  IQ: "Irak", IR: "Irán", IE: "Irlanda", IS: "Islandia",
  MH: "Islas Marshall", SB: "Islas Salomón", IL: "Israel", IT: "Italia",
  JM: "Jamaica", JP: "Japón", JO: "Jordania", KZ: "Kazajistán", KE: "Kenia",
  KG: "Kirguistán", KI: "Kiribati", KW: "Kuwait", LA: "Laos", LS: "Lesoto",
  LV: "Letonia", LB: "Líbano", LR: "Liberia", LY: "Libia",
  LI: "Liechtenstein", LT: "Lituania", LU: "Luxemburgo",
  MK: "Macedonia del Norte", MG: "Madagascar", MY: "Malasia", MW: "Malaui",
  MV: "Maldivas", ML: "Malí", MT: "Malta", MA: "Marruecos", MU: "Mauricio",
  MR: "Mauritania", MX: "México", FM: "Micronesia", MD: "Moldavia",
  MC: "Mónaco", MN: "Mongolia", ME: "Montenegro", MZ: "Mozambique",
  NA: "Namibia", NR: "Nauru", NP: "Nepal", NI: "Nicaragua", NE: "Níger",
  NG: "Nigeria", NO: "Noruega", NZ: "Nueva Zelanda", OM: "Omán",
  NL: "Países Bajos", PK: "Pakistán", PW: "Palaos", PA: "Panamá",
  PG: "Papúa Nueva Guinea", PY: "Paraguay", PE: "Perú", PL: "Polonia",
  PT: "Portugal", GB: "Reino Unido", CF: "República Centroafricana",
  CZ: "República Checa", CG: "República del Congo",
  CD: "República Democrática del Congo", DO: "República Dominicana",
  RW: "Ruanda", RO: "Rumanía", RU: "Rusia", WS: "Samoa",
  KN: "San Cristóbal y Nieves", SM: "San Marino",
  VC: "San Vicente y las Granadinas", LC: "Santa Lucía",
  ST: "Santo Tomé y Príncipe", SN: "Senegal", RS: "Serbia", SC: "Seychelles",
  SL: "Sierra Leona", SG: "Singapur", SY: "Siria", SO: "Somalia",
  LK: "Sri Lanka", ZA: "Sudáfrica", SD: "Sudán", SS: "Sudán del Sur",
  SE: "Suecia", CH: "Suiza", SR: "Surinam", TH: "Tailandia", TZ: "Tanzania",
  TJ: "Tayikistán", TL: "Timor Oriental", TG: "Togo", TO: "Tonga",
  TT: "Trinidad y Tobago", TN: "Túnez", TM: "Turkmenistán", TR: "Turquía",
  TV: "Tuvalu", UA: "Ucrania", UG: "Uganda", UY: "Uruguay", UZ: "Uzbekistán",
  VU: "Vanuatu", VE: "Venezuela", VN: "Vietnam", YE: "Yemen", DJ: "Yibuti",
  ZM: "Zambia", ZW: "Zimbabue",
};

/**
 * Detecta el país del usuario a partir de la configuración regional del
 * dispositivo (sin red, sin permisos). Devuelve el nombre en español que
 * usa profiles.country, o null si el dispositivo no reporta una región
 * reconocida (caso raro, ej. emuladores mal configurados).
 */
export function getDeviceCountryName(): string | null {
  try {
    // Import diferido para no romper si el paquete no está instalado en
    // algún entorno de test.
    const Localization = require("expo-localization");
    const locales = Localization.getLocales?.();
    const region: string | undefined = locales?.[0]?.regionCode ?? locales?.[0]?.region;
    if (!region) return null;
    return ISO_TO_SPANISH_COUNTRY[region.toUpperCase()] ?? null;
  } catch {
    return null;
  }
}
