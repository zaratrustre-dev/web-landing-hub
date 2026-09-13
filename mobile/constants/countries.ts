// Mapping of ISO 3166-1 alpha-2 region code (the one returned by
// expo-localization based on the device's locale) to the country name in
// English. Must match EXACTLY the values in src/lib/countries.ts (admin
// panel) so that the profiles.country field always has the same format
// no matter where it comes from.
export const ISO_TO_COUNTRY_NAME: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DE: "Germany", AD: "Andorra",
  AO: "Angola", AG: "Antigua and Barbuda", SA: "Saudi Arabia", DZ: "Algeria",
  AR: "Argentina", AM: "Armenia", AU: "Australia", AT: "Austria",
  AZ: "Azerbaijan", BS: "Bahamas", BD: "Bangladesh", BB: "Barbados",
  BH: "Bahrain", BE: "Belgium", BZ: "Belize", BJ: "Benin", BY: "Belarus",
  MM: "Myanmar", BO: "Bolivia", BA: "Bosnia and Herzegovina", BW: "Botswana",
  BR: "Brazil", BN: "Brunei", BG: "Bulgaria", BF: "Burkina Faso",
  BI: "Burundi", BT: "Bhutan", CV: "Cape Verde", KH: "Cambodia",
  CM: "Cameroon", CA: "Canada", QA: "Qatar", TD: "Chad", CL: "Chile",
  CN: "China", CY: "Cyprus", VA: "Vatican City", CO: "Colombia",
  KM: "Comoros", KP: "North Korea", KR: "South Korea", CI: "Ivory Coast",
  CR: "Costa Rica", HR: "Croatia", CU: "Cuba", DK: "Denmark", DM: "Dominica",
  EC: "Ecuador", EG: "Egypt", SV: "El Salvador", AE: "United Arab Emirates",
  ER: "Eritrea", SK: "Slovakia", SI: "Slovenia", ES: "Spain",
  US: "United States", EE: "Estonia", SZ: "Eswatini", ET: "Ethiopia",
  PH: "Philippines", FI: "Finland", FJ: "Fiji", FR: "France", GA: "Gabon",
  GM: "Gambia", GE: "Georgia", GH: "Ghana", GD: "Grenada", GR: "Greece",
  GT: "Guatemala", GN: "Guinea", GW: "Guinea-Bissau",
  GQ: "Equatorial Guinea", GY: "Guyana", HT: "Haiti", HN: "Honduras",
  HU: "Hungary", IN: "India", ID: "Indonesia", IQ: "Iraq", IR: "Iran",
  IE: "Ireland", IS: "Iceland", MH: "Marshall Islands",
  SB: "Solomon Islands", IL: "Israel", IT: "Italy", JM: "Jamaica",
  JP: "Japan", JO: "Jordan", KZ: "Kazakhstan", KE: "Kenya", KG: "Kyrgyzstan",
  KI: "Kiribati", KW: "Kuwait", LA: "Laos", LS: "Lesotho", LV: "Latvia",
  LB: "Lebanon", LR: "Liberia", LY: "Libya", LI: "Liechtenstein",
  LT: "Lithuania", LU: "Luxembourg", MK: "North Macedonia", MG: "Madagascar",
  MY: "Malaysia", MW: "Malawi", MV: "Maldives", ML: "Mali", MT: "Malta",
  MA: "Morocco", MU: "Mauritius", MR: "Mauritania", MX: "Mexico",
  FM: "Micronesia", MD: "Moldova", MC: "Monaco", MN: "Mongolia",
  ME: "Montenegro", MZ: "Mozambique", NA: "Namibia", NR: "Nauru",
  NP: "Nepal", NI: "Nicaragua", NE: "Niger", NG: "Nigeria", NO: "Norway",
  NZ: "New Zealand", OM: "Oman", NL: "Netherlands", PK: "Pakistan",
  PW: "Palau", PA: "Panama", PG: "Papua New Guinea", PY: "Paraguay",
  PE: "Peru", PL: "Poland", PT: "Portugal", GB: "United Kingdom",
  CF: "Central African Republic", CZ: "Czech Republic",
  CG: "Republic of the Congo", CD: "Democratic Republic of the Congo",
  DO: "Dominican Republic", RW: "Rwanda", RO: "Romania", RU: "Russia",
  WS: "Samoa", KN: "Saint Kitts and Nevis", SM: "San Marino",
  VC: "Saint Vincent and the Grenadines", LC: "Saint Lucia",
  ST: "São Tomé and Príncipe", SN: "Senegal", RS: "Serbia", SC: "Seychelles",
  SL: "Sierra Leone", SG: "Singapore", SY: "Syria", SO: "Somalia",
  LK: "Sri Lanka", ZA: "South Africa", SD: "Sudan", SS: "South Sudan",
  SE: "Sweden", CH: "Switzerland", SR: "Suriname", TH: "Thailand",
  TZ: "Tanzania", TJ: "Tajikistan", TL: "Timor-Leste", TG: "Togo",
  TO: "Tonga", TT: "Trinidad and Tobago", TN: "Tunisia", TM: "Turkmenistan",
  TR: "Turkey", TV: "Tuvalu", UA: "Ukraine", UG: "Uganda", UY: "Uruguay",
  UZ: "Uzbekistan", VU: "Vanuatu", VE: "Venezuela", VN: "Vietnam",
  YE: "Yemen", DJ: "Djibouti", ZM: "Zambia", ZW: "Zimbabwe",
};

/**
 * Detects the user's country from the device's locale (no network, no
 * permissions needed). Returns the English name used by profiles.country,
 * or null if the device doesn't report a recognized region (rare case,
 * e.g. misconfigured emulators).
 */
export function getDeviceCountryName(): string | null {
  try {
    // Deferred import so this doesn't break if the package isn't
    // installed in some test environment.
    const Localization = require("expo-localization");
    const locales = Localization.getLocales?.();
    const region: string | undefined = locales?.[0]?.regionCode ?? locales?.[0]?.region;
    if (!region) return null;
    return ISO_TO_COUNTRY_NAME[region.toUpperCase()] ?? null;
  } catch {
    return null;
  }
}
