/**
 * Format date and time for schedule displays
 * 
 * @param date - Date string in ISO format
 * @param time - Time string 
 * @returns Object with formatted date and the original time
 */
export const formatScheduleDateTime = (
  date: string,
  time: string,
): {
  formattedDate: string;
  time: string;
} => {
  const dateObject = new Date(date);
  const formattedDate = dateObject.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return { formattedDate, time };
};