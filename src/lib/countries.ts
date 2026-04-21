export type Country = {
  code: string;
  identityCode?: string;
  name: string;
};

export const COUNTRIES: readonly Country[] = [
  { code: "AF", name: "Afghanistan" },
  { code: "AX", name: "Åland Islands" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AS", name: "American Samoa" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AI", name: "Anguilla" },
  { code: "AQ", name: "Antarctica" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AW", name: "Aruba" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BM", name: "Bermuda" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BQ", name: "Bonaire, Sint Eustatius and Saba" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BV", name: "Bouvet Island" },
  { code: "BR", name: "Brazil" },
  { code: "IO", name: "British Indian Ocean Territory" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "KY", name: "Cayman Islands" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CX", name: "Christmas Island" },
  { code: "CC", name: "Cocos (Keeling) Islands" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CK", name: "Cook Islands" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Cote d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CW", name: "Curaçao" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "CD", name: "Democratic Republic of the Congo" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FK", name: "Falkland Islands (Malvinas)" },
  { code: "FO", name: "Faroe Islands" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GF", name: "French Guiana" },
  { code: "PF", name: "French Polynesia" },
  { code: "TF", name: "French Southern Territories" },
  { code: "GA", name: "Gabon" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GI", name: "Gibraltar" },
  { code: "GR", name: "Greece" },
  { code: "GL", name: "Greenland" },
  { code: "GD", name: "Grenada" },
  { code: "GP", name: "Guadeloupe" },
  { code: "GU", name: "Guam" },
  { code: "GT", name: "Guatemala" },
  { code: "GG", name: "Guernsey" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HM", name: "Heard Island and McDonald Islands" },
  { code: "HN", name: "Honduras" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IM", name: "Isle of Man" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JE", name: "Jersey" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "XK", name: "Kosovo" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macao" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MQ", name: "Martinique" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "YT", name: "Mayotte" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MS", name: "Montserrat" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NC", name: "New Caledonia" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NU", name: "Niue" },
  { code: "NF", name: "Norfolk Island" },
  { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PN", name: "Pitcairn" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "PR", name: "Puerto Rico" },
  { code: "QA", name: "Qatar" },
  { code: "CG", name: "Republic of the Congo" },
  { code: "RE", name: "Reunion" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "BL", name: "Saint Barthélemy" },
  { code: "SH", name: "Saint Helena" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "MF", name: "Saint Martin (French part)" },
  { code: "PM", name: "Saint Pierre and Miquelon" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SX", name: "Sint Maarten (Dutch part)" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "GS", name: "South Georgia and the South Sandwich Islands" },
  { code: "KR", name: "South Korea" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SJ", name: "Svalbard and Jan Mayen" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "GM", name: "The Gambia" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TK", name: "Tokelau" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Türkiye" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TC", name: "Turks and Caicos Islands" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UM", name: "United States Minor Outlying Islands" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "VG", name: "Virgin Islands, British" },
  { code: "VI", name: "Virgin Islands, U.S." },
  { code: "WF", name: "Wallis and Futuna" },
  { code: "EH", name: "Western Sahara" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

const ISO_COUNTRY_CODE_PAIRS =
  "AF:AFG,AL:ALB,DZ:DZA,AS:ASM,AD:AND,AO:AGO,AI:AIA,AQ:ATA,AG:ATG,AR:ARG,AM:ARM,AW:ABW,AU:AUS,AT:AUT,AZ:AZE,BS:BHS,BH:BHR,BD:BGD,BB:BRB,BY:BLR,BE:BEL,BZ:BLZ,BJ:BEN,BM:BMU,BT:BTN,BO:BOL,BA:BIH,BW:BWA,BV:BVT,BR:BRA,IO:IOT,BN:BRN,BG:BGR,BF:BFA,BI:BDI,KH:KHM,CM:CMR,CA:CAN,CV:CPV,KY:CYM,CF:CAF,TD:TCD,CL:CHL,CN:CHN,CX:CXR,CC:CCK,CO:COL,KM:COM,CG:COG,CD:COD,CK:COK,CR:CRI,CI:CIV,HR:HRV,CU:CUB,CY:CYP,CZ:CZE,DK:DNK,DJ:DJI,DM:DMA,DO:DOM,EC:ECU,EG:EGY,SV:SLV,GQ:GNQ,ER:ERI,EE:EST,ET:ETH,FK:FLK,FO:FRO,FJ:FJI,FI:FIN,FR:FRA,GF:GUF,PF:PYF,TF:ATF,GA:GAB,GM:GMB,GE:GEO,DE:DEU,GH:GHA,GI:GIB,GR:GRC,GL:GRL,GD:GRD,GP:GLP,GU:GUM,GT:GTM,GN:GIN,GW:GNB,GY:GUY,HT:HTI,HM:HMD,VA:VAT,HN:HND,HK:HKG,HU:HUN,IS:ISL,IN:IND,ID:IDN,IR:IRN,IQ:IRQ,IE:IRL,IL:ISR,IT:ITA,JM:JAM,JP:JPN,JO:JOR,KZ:KAZ,KE:KEN,KI:KIR,KP:PRK,KR:KOR,KW:KWT,KG:KGZ,LA:LAO,LV:LVA,LB:LBN,LS:LSO,LR:LBR,LY:LBY,LI:LIE,LT:LTU,LU:LUX,MO:MAC,MG:MDG,MW:MWI,MY:MYS,MV:MDV,ML:MLI,MT:MLT,MH:MHL,MQ:MTQ,MR:MRT,MU:MUS,YT:MYT,MX:MEX,FM:FSM,MD:MDA,MC:MCO,MN:MNG,MS:MSR,MA:MAR,MZ:MOZ,MM:MMR,NA:NAM,NR:NRU,NP:NPL,NL:NLD,NC:NCL,NZ:NZL,NI:NIC,NE:NER,NG:NGA,NU:NIU,NF:NFK,MP:MNP,MK:MKD,NO:NOR,OM:OMN,PK:PAK,PW:PLW,PS:PSE,PA:PAN,PG:PNG,PY:PRY,PE:PER,PH:PHL,PN:PCN,PL:POL,PT:PRT,PR:PRI,QA:QAT,RE:REU,RO:ROU,RU:RUS,RW:RWA,SH:SHN,KN:KNA,LC:LCA,PM:SPM,VC:VCT,WS:WSM,SM:SMR,ST:STP,SA:SAU,SN:SEN,SC:SYC,SL:SLE,SG:SGP,SK:SVK,SI:SVN,SB:SLB,SO:SOM,ZA:ZAF,GS:SGS,ES:ESP,LK:LKA,SD:SDN,SR:SUR,SJ:SJM,SZ:SWZ,SE:SWE,CH:CHE,SY:SYR,TW:TWN,TJ:TJK,TZ:TZA,TH:THA,TL:TLS,TG:TGO,TK:TKL,TO:TON,TT:TTO,TN:TUN,TR:TUR,TM:TKM,TC:TCA,TV:TUV,UG:UGA,UA:UKR,AE:ARE,GB:GBR,US:USA,UM:UMI,UY:URY,UZ:UZB,VU:VUT,VE:VEN,VN:VNM,VG:VGB,VI:VIR,WF:WLF,EH:ESH,YE:YEM,ZM:ZMB,ZW:ZWE,AX:ALA,BQ:BES,CW:CUW,GG:GGY,IM:IMN,JE:JEY,ME:MNE,BL:BLM,MF:MAF,RS:SRB,SX:SXM,SS:SSD,XK:XKK";
const COUNTRY_CODE_PAIRS = ISO_COUNTRY_CODE_PAIRS.split(",").map((pair) => pair.split(":") as [string, string]);
const ISO3_BY_ISO2 = new Map(COUNTRY_CODE_PAIRS);
const ISO2_BY_ISO3 = new Map(COUNTRY_CODE_PAIRS.map(([alpha2, alpha3]) => [alpha3, alpha2]));

const COUNTRY_NAME_BY_CODE = new Map(
  COUNTRIES.map((country) => [country.code, country.name]),
);

export function findCountry(code: string | null | undefined): Country | null {
  if (!code) {
    return null;
  }

  const normalized = normalizeCountryCode(code);
  if (!normalized) {
    return null;
  }
  const name = COUNTRY_NAME_BY_CODE.get(normalized.alpha2);
  return name ? { code: normalized.alpha2, identityCode: normalized.alpha3, name } : null;
}

export function getCountryName(code: string | null | undefined): string | null {
  return findCountry(code)?.name ?? null;
}

function getCountryDisplayLocale(locale: string | null | undefined): "ar" | "zh" | "en" {
  const normalized = String(locale ?? "").toLowerCase();
  if (normalized.startsWith("ar")) return "ar";
  if (normalized.startsWith("zh")) return "zh";
  return "en";
}

export function getCountryDisplayName(
  code: string | null | undefined,
  locale?: string | null,
): string | null {
  if (!code) {
    return null;
  }

  const normalizedCode = code.trim().toUpperCase();
  const normalized = normalizeCountryCode(normalizedCode);
  const alpha2 = normalized?.alpha2 ?? normalizedCode;
  const displayLocale = getCountryDisplayLocale(locale);

  if (alpha2 === "PS") {
    if (displayLocale === "ar") return "فلسطين";
    if (displayLocale === "zh") return "巴勒斯坦";
    return "Palestine";
  }

  if (displayLocale === "en") {
    return getCountryName(normalizedCode) ?? normalizedCode;
  }

  try {
    const displayNames = new Intl.DisplayNames([locale ?? "en"], { type: "region" });
    return displayNames.of(alpha2) ?? getCountryName(normalizedCode) ?? normalizedCode;
  } catch {
    return getCountryName(normalizedCode) ?? normalizedCode;
  }
}

export function isCountryCode(code: string | null | undefined): boolean {
  return findCountry(code) != null;
}

export function normalizeCountryCode(code: string | null | undefined): { alpha2: string; alpha3: string } | null {
  if (!code) {
    return null;
  }

  const normalized = code.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) {
    const alpha3 = ISO3_BY_ISO2.get(normalized);
    return alpha3 ? { alpha2: normalized, alpha3 } : null;
  }
  if (/^[A-Z]{3}$/.test(normalized)) {
    const alpha2 = ISO2_BY_ISO3.get(normalized);
    return alpha2 ? { alpha2, alpha3: normalized } : null;
  }
  return null;
}
