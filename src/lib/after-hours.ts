/**
 * Validates if the current time is after business hours.
 *
 * Business hours: businessHoursStart <= hour < businessHoursEnd
 *  - Default: 08:00 (inclusive) to 18:00 (exclusive)
 *  - i.e. hour < 8 || hour >= 18 is after hours
 *  - Weekends are always after hours
 *
 * Spec rule: >= 18:00 is after hours (not ≤ 18:00)
 */
export function isAfterHours(
    dateToCheck = new Date(),
    businessHoursStart = 8,
    businessHoursEnd = 18,
    businessDays = [1, 2, 3, 4, 5], // Mon-Fri
): boolean {
    const currentDay = dateToCheck.getDay(); // 0 = Sunday, 6 = Saturday

    // Weekends are always after hours
    if (!businessDays.includes(currentDay)) return true;

    const currentHour = dateToCheck.getHours();
    const currentMinute = dateToCheck.getMinutes();

    // Convert to fractional hours for precise minute-level comparison
    const fractionalHour = currentHour + currentMinute / 60;

    // After hours: before start or at-or-after end
    return fractionalHour < businessHoursStart || fractionalHour >= businessHoursEnd;
}
