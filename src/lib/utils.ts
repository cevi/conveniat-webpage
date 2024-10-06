export const stringDateToLocale = (date: string): string => {
  return new Date(date).toLocaleString('de-CH')
}
