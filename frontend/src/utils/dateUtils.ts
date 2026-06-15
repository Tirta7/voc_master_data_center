/**
 * Parses an offset string (e.g., "04:00") and returns the business day code ('SUN', 'MON', etc.).
 * If the current time is before the offset (e.g., 02:00 AM with offset 04:00), 
 * it will return the day code for the previous calendar day.
 */
export const getBusinessDayCode = (offsetString?: string): string => {
    // Default to '04:00' if no offset is provided
    const offset = offsetString || '04:00';
    const [offsetHours, offsetMinutes] = offset.split(':').map(Number);
    
    const now = new Date();
    
    // Shift the current time back by the offset amount
    // So if it's 03:00 AM and offset is 04:00, shifted time will be 23:00 PM the previous day.
    const shiftedTime = new Date(now.getTime() - (offsetHours * 60 * 60 * 1000) - ((offsetMinutes || 0) * 60 * 1000));
    
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[shiftedTime.getDay()];
};
