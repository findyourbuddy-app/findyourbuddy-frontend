export const MIN_AGE = 18;
export const MAX_AGE = 99;
export const MAX_BIO_LENGTH = 280;
export const MAX_OCCUPATION_LENGTH = 60;

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
