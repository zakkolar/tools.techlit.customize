export function isValidDate(date) {
    const IsoDateRe = new RegExp("^([0-9]{4})-([0-9]{2})-([0-9]{2})$");
    const matches = date.match(IsoDateRe);
    if (!matches) return false;

    const [year, month, day] = matches.slice(1).map(item => parseInt(item));
    const composedDate = new Date(year, month - 1, day);

    return ((composedDate.getMonth() === month - 1) &&
        (composedDate.getDate() === day) &&
        (composedDate.getFullYear() === year));
}