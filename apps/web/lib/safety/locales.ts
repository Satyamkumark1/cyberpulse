export const SAFETY_LOCALES = [
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "as", nativeName: "অসমীয়া", englishName: "Assamese" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali" },
  { code: "brx", nativeName: "बड़ो", englishName: "Bodo" },
  { code: "doi", nativeName: "डोगरी", englishName: "Dogri" },
  { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati" },
  { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada" },
  { code: "ks", nativeName: "کٲشُر", englishName: "Kashmiri", dir: "rtl" },
  { code: "kok", nativeName: "कोंकणी", englishName: "Konkani" },
  { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam" },
  { code: "mni", nativeName: "মৈতৈলোন্", englishName: "Manipuri" },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi" },
  { code: "mai", nativeName: "मैथिली", englishName: "Maithili" },
  { code: "ne", nativeName: "नेपाली", englishName: "Nepali" },
  { code: "or", nativeName: "ଓଡ଼ିଆ", englishName: "Odia" },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi" },
  { code: "sa", nativeName: "संस्कृतम्", englishName: "Sanskrit" },
  { code: "sat", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", englishName: "Santali" },
  { code: "sd", nativeName: "سنڌي", englishName: "Sindhi", dir: "rtl" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil" },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu" },
  { code: "ur", nativeName: "اردو", englishName: "Urdu", dir: "rtl" },
  { code: "bho", nativeName: "भोजपुरी", englishName: "Bhojpuri" },
  { code: "raj", nativeName: "राजस्थानी", englishName: "Rajasthani" },
  { code: "tcy", nativeName: "ತುಳು", englishName: "Tulu" },
  { code: "gon", nativeName: "गोंडी", englishName: "Gondi" },
  { code: "kha", nativeName: "Khasi", englishName: "Khasi" },
] as const;

export type SafetyLocale = (typeof SAFETY_LOCALES)[number]["code"];

const localeCodes = new Set<string>(SAFETY_LOCALES.map((locale) => locale.code));

export function safetyLocale(value: string | string[] | undefined): SafetyLocale {
  if (Array.isArray(value)) return "en";
  const candidate = value;
  return candidate && localeCodes.has(candidate) ? (candidate as SafetyLocale) : "en";
}

export function localeDirection(locale: SafetyLocale): "ltr" | "rtl" {
  const item = SAFETY_LOCALES.find((candidate) => candidate.code === locale);
  return item && "dir" in item && item.dir === "rtl" ? "rtl" : "ltr";
}
