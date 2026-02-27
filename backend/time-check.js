
const now = new Date();
console.log('Now (ISO):', now.toISOString());
console.log('Now (Local):', now.toString());
console.log('Timezone Offset (mins):', now.getTimezoneOffset());

const hours = 4;
const minutes = 0;
const effectiveDay = new Date(now.getTime() - (hours * 3600000 + minutes * 60000));
console.log('Effective Day (now - 4h):', effectiveDay.toString());

effectiveDay.setHours(0, 0, 0, 0);
console.log('Effective Day (Start of day):', effectiveDay.toString());

const businessDayStart = new Date(effectiveDay);
businessDayStart.setHours(hours, minutes, 0, 0);
console.log('Business Day Start:', businessDayStart.toString());
console.log('Business Day Start (ISO):', businessDayStart.toISOString());
