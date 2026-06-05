import type { Locale } from "@/lib/i18n";

export type CountryOption = {
  code: string;
  dialCode: string;
  en: string;
  ru: string;
};

export const countries: CountryOption[] = [
  { code: "AE", dialCode: "+971", en: "United Arab Emirates", ru: "ОАЭ" },
  { code: "AF", dialCode: "+93", en: "Afghanistan", ru: "Афганистан" },
  { code: "AL", dialCode: "+355", en: "Albania", ru: "Албания" },
  { code: "AM", dialCode: "+374", en: "Armenia", ru: "Армения" },
  { code: "AR", dialCode: "+54", en: "Argentina", ru: "Аргентина" },
  { code: "AT", dialCode: "+43", en: "Austria", ru: "Австрия" },
  { code: "AU", dialCode: "+61", en: "Australia", ru: "Австралия" },
  { code: "AZ", dialCode: "+994", en: "Azerbaijan", ru: "Азербайджан" },
  { code: "BA", dialCode: "+387", en: "Bosnia and Herzegovina", ru: "Босния и Герцеговина" },
  { code: "BD", dialCode: "+880", en: "Bangladesh", ru: "Бангладеш" },
  { code: "BE", dialCode: "+32", en: "Belgium", ru: "Бельгия" },
  { code: "BG", dialCode: "+359", en: "Bulgaria", ru: "Болгария" },
  { code: "BH", dialCode: "+973", en: "Bahrain", ru: "Бахрейн" },
  { code: "BR", dialCode: "+55", en: "Brazil", ru: "Бразилия" },
  { code: "BY", dialCode: "+375", en: "Belarus", ru: "Беларусь" },
  { code: "CA", dialCode: "+1", en: "Canada", ru: "Канада" },
  { code: "CH", dialCode: "+41", en: "Switzerland", ru: "Швейцария" },
  { code: "CN", dialCode: "+86", en: "China", ru: "Китай" },
  { code: "CY", dialCode: "+357", en: "Cyprus", ru: "Кипр" },
  { code: "CZ", dialCode: "+420", en: "Czech Republic", ru: "Чехия" },
  { code: "DE", dialCode: "+49", en: "Germany", ru: "Германия" },
  { code: "DK", dialCode: "+45", en: "Denmark", ru: "Дания" },
  { code: "DZ", dialCode: "+213", en: "Algeria", ru: "Алжир" },
  { code: "EG", dialCode: "+20", en: "Egypt", ru: "Египет" },
  { code: "ES", dialCode: "+34", en: "Spain", ru: "Испания" },
  { code: "FI", dialCode: "+358", en: "Finland", ru: "Финляндия" },
  { code: "FR", dialCode: "+33", en: "France", ru: "Франция" },
  { code: "GB", dialCode: "+44", en: "United Kingdom", ru: "Великобритания" },
  { code: "GE", dialCode: "+995", en: "Georgia", ru: "Грузия" },
  { code: "GH", dialCode: "+233", en: "Ghana", ru: "Гана" },
  { code: "GR", dialCode: "+30", en: "Greece", ru: "Греция" },
  { code: "HK", dialCode: "+852", en: "Hong Kong", ru: "Гонконг" },
  { code: "HR", dialCode: "+385", en: "Croatia", ru: "Хорватия" },
  { code: "HU", dialCode: "+36", en: "Hungary", ru: "Венгрия" },
  { code: "ID", dialCode: "+62", en: "Indonesia", ru: "Индонезия" },
  { code: "IE", dialCode: "+353", en: "Ireland", ru: "Ирландия" },
  { code: "IL", dialCode: "+972", en: "Israel", ru: "Израиль" },
  { code: "IN", dialCode: "+91", en: "India", ru: "Индия" },
  { code: "IQ", dialCode: "+964", en: "Iraq", ru: "Ирак" },
  { code: "IR", dialCode: "+98", en: "Iran", ru: "Иран" },
  { code: "IT", dialCode: "+39", en: "Italy", ru: "Италия" },
  { code: "JO", dialCode: "+962", en: "Jordan", ru: "Иордания" },
  { code: "JP", dialCode: "+81", en: "Japan", ru: "Япония" },
  { code: "KE", dialCode: "+254", en: "Kenya", ru: "Кения" },
  { code: "KG", dialCode: "+996", en: "Kyrgyzstan", ru: "Кыргызстан" },
  { code: "KR", dialCode: "+82", en: "South Korea", ru: "Южная Корея" },
  { code: "KW", dialCode: "+965", en: "Kuwait", ru: "Кувейт" },
  { code: "KZ", dialCode: "+7", en: "Kazakhstan", ru: "Казахстан" },
  { code: "LB", dialCode: "+961", en: "Lebanon", ru: "Ливан" },
  { code: "LK", dialCode: "+94", en: "Sri Lanka", ru: "Шри-Ланка" },
  { code: "LT", dialCode: "+370", en: "Lithuania", ru: "Литва" },
  { code: "LV", dialCode: "+371", en: "Latvia", ru: "Латвия" },
  { code: "MA", dialCode: "+212", en: "Morocco", ru: "Марокко" },
  { code: "MD", dialCode: "+373", en: "Moldova", ru: "Молдова" },
  { code: "ME", dialCode: "+382", en: "Montenegro", ru: "Черногория" },
  { code: "MK", dialCode: "+389", en: "North Macedonia", ru: "Северная Македония" },
  { code: "MN", dialCode: "+976", en: "Mongolia", ru: "Монголия" },
  { code: "MY", dialCode: "+60", en: "Malaysia", ru: "Малайзия" },
  { code: "NG", dialCode: "+234", en: "Nigeria", ru: "Нигерия" },
  { code: "NL", dialCode: "+31", en: "Netherlands", ru: "Нидерланды" },
  { code: "NO", dialCode: "+47", en: "Norway", ru: "Норвегия" },
  { code: "NZ", dialCode: "+64", en: "New Zealand", ru: "Новая Зеландия" },
  { code: "OM", dialCode: "+968", en: "Oman", ru: "Оман" },
  { code: "PK", dialCode: "+92", en: "Pakistan", ru: "Пакистан" },
  { code: "PL", dialCode: "+48", en: "Poland", ru: "Польша" },
  { code: "PT", dialCode: "+351", en: "Portugal", ru: "Португалия" },
  { code: "QA", dialCode: "+974", en: "Qatar", ru: "Катар" },
  { code: "RO", dialCode: "+40", en: "Romania", ru: "Румыния" },
  { code: "RS", dialCode: "+381", en: "Serbia", ru: "Сербия" },
  { code: "RU", dialCode: "+7", en: "Russia", ru: "Россия" },
  { code: "SA", dialCode: "+966", en: "Saudi Arabia", ru: "Саудовская Аравия" },
  { code: "SE", dialCode: "+46", en: "Sweden", ru: "Швеция" },
  { code: "SG", dialCode: "+65", en: "Singapore", ru: "Сингапур" },
  { code: "SI", dialCode: "+386", en: "Slovenia", ru: "Словения" },
  { code: "SK", dialCode: "+421", en: "Slovakia", ru: "Словакия" },
  { code: "TH", dialCode: "+66", en: "Thailand", ru: "Таиланд" },
  { code: "TJ", dialCode: "+992", en: "Tajikistan", ru: "Таджикистан" },
  { code: "TM", dialCode: "+993", en: "Turkmenistan", ru: "Туркменистан" },
  { code: "TN", dialCode: "+216", en: "Tunisia", ru: "Тунис" },
  { code: "TR", dialCode: "+90", en: "Turkey", ru: "Турция" },
  { code: "UA", dialCode: "+380", en: "Ukraine", ru: "Украина" },
  { code: "US", dialCode: "+1", en: "United States", ru: "США" },
  { code: "UZ", dialCode: "+998", en: "Uzbekistan", ru: "Узбекистан" },
  { code: "VN", dialCode: "+84", en: "Vietnam", ru: "Вьетнам" },
  { code: "ZA", dialCode: "+27", en: "South Africa", ru: "ЮАР" }
];

export const countryCodes = new Set(countries.map((country) => country.code));

export function countryOptions(locale: Locale) {
  return countries
    .map((country) => ({ value: country.code, label: country[locale] }))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
}

export function dialCodeOptions(locale: Locale) {
  return countries
    .map((country) => ({
      value: country.dialCode,
      label: `${country[locale]} ${country.dialCode}`
    }))
    .sort((left, right) => left.label.localeCompare(right.label, locale));
}

export function normalizeCountryCode(value?: string | null) {
  if (!value) return "";

  const normalized = value.trim().toUpperCase();
  if (countryCodes.has(normalized)) return normalized;

  const match = countries.find((country) => {
    const lowerValue = value.trim().toLowerCase();
    return country.en.toLowerCase() === lowerValue || country.ru.toLowerCase() === lowerValue;
  });

  return match?.code ?? "";
}

export function countryName(value: string | null | undefined, locale: Locale) {
  if (!value) return "";
  const code = normalizeCountryCode(value);
  const country = countries.find((item) => item.code === code);
  return country ? country[locale] : value;
}
