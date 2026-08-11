export const MIN_AGE = 18;
export const MAX_AGE = 99;
export const MAX_BIO_LENGTH = 280;

export function isValidAge(age: number): boolean {
  return Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE;
}
