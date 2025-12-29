/**
 * Parses a time string (e.g., "9:00" or "09:30") into minutes from midnight.
 */
export const parseTimeToMinutes = (timeString: string): number => {
    const [hours = 0, minutes = 0] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Checks if two time slots on the same date overlap.
 * Time format: "HH:MM - HH:MM" (e.g., "09:00 - 10:30")
 */
export const isOverlapping = (
    time1: string,
    date1: string,
    time2: string,
    date2: string,
): boolean => {
    if (date1 !== date2) return false;
    const [start1String, end1String] = time1.split(' - ').map((t) => t.trim());
    const [start2String, end2String] = time2.split(' - ').map((t) => t.trim());
    if (!start1String || !end1String || !start2String || !end2String) return false;

    const start1 = parseTimeToMinutes(start1String);
    const end1 = parseTimeToMinutes(end1String);
    const start2 = parseTimeToMinutes(start2String);
    const end2 = parseTimeToMinutes(end2String);

    return start1 < end2 && start2 < end1;
};
