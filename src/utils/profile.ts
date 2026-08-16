export const MIN_AGE = 18;
export const MAX_AGE = 99;
export const MAX_BIO_LENGTH = 280;
export const MAX_OCCUPATION_LENGTH = 60;
export const MIN_DISPLAY_NAME_LENGTH = 2;
export const MAX_DISPLAY_NAME_LENGTH = 40;

export function isValidAge(age: number): boolean {
  return Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE;
}

export function calculateAge(birthDate: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hadBirthdayThisYear) {
    age -= 1;
  }
  return age;
}

export function isValidBirthDate(day: number, month: number, year: number): boolean {
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isRealDate) {
    return false;
  }
  return isValidAge(calculateAge(date));
}

export function validateBirthDateString(dateStr: string): { valid: boolean; error?: string } {
  const trimmed = dateStr.trim();
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(trimmed)) {
    return { valid: false, error: "Doğum tarihiniz YYYY-AA-GG formatında olmalıdır (Örn: 1998-05-15)." };
  }

  const parts = trimmed.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isRealDate) {
    return { valid: false, error: "Geçersiz bir takvim tarihi girdiniz (Örn: 31 Şubat veya 13. Ay girilemez)." };
  }

  const age = calculateAge(date);
  if (age < MIN_AGE) {
    return { valid: false, error: `Uygulamamızı kullanabilmek için en az ${MIN_AGE} yaşında olmalısınız (Hesaplanan yaşınız: ${age}).` };
  }
  if (age > MAX_AGE) {
    return { valid: false, error: `Lütfen geçerli bir doğum yılı giriniz (${MAX_AGE} yaşından büyük girilemez).` };
  }

  return { valid: true };
}

export function validateDisplayName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "Lütfen bir görünen isim (Ad veya Rumuz) girin." };
  }
  if (trimmed.length < MIN_DISPLAY_NAME_LENGTH) {
    return { valid: false, error: `Görünen isminiz en az ${MIN_DISPLAY_NAME_LENGTH} karakter olmalıdır.` };
  }
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return { valid: false, error: `Görünen isminiz en fazla ${MAX_DISPLAY_NAME_LENGTH} karakter olabilir.` };
  }
  return { valid: true };
}
