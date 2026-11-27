// America/Hermosillo is UTC-7 all year (no daylight saving).
const OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// The previous local day as UTC ISO strings: `from` inclusive, `to` exclusive.
function yesterdayRange(now) {
    // Shift so that the UTC fields of this date read as Hermosillo local time.
    const local = new Date(now.getTime() - OFFSET_MS);
    const todayStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
    return {
        from: new Date(todayStart - DAY_MS + OFFSET_MS).toISOString(),
        to: new Date(todayStart + OFFSET_MS).toISOString(),
        day: new Date(todayStart - DAY_MS).toISOString().slice(0, 10),
    };
}

module.exports = { yesterdayRange };
