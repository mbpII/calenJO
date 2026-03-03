import { CalendarEvent } from '@/types/calendar';
import { MONTH_ABBREVIATIONS } from './constants';

/**
 * Parses shift confirmation messages from OCR text or pasted content.
 * Extracts date and time ranges from Amazon-style shift messages.
 *
 * Supported format: "[Day], Month DD, [YYYY] from HH:MM to HH:MM"
 * Examples:
 * - "Thu, Mar 5, 2026 from 15:30 to 18:00"
 * - "March 15 from 09:00-17:00"
 * - "Sat, January 10, 2025 from 08:00 to 16:30"
 *
 * The parser is OCR-tolerant and handles common misreadings like
 * "15;30" instead of "15:30" and "t0" instead of "to".
 *
 * @param text - Raw text from OCR or pasted content
 * @param fallbackYear - Year to use if date doesn't include one (defaults to current year)
 * @returns Array of CalendarEvent objects, sorted by date then start time
 */
export function parseShiftMessagesFromText(text: string, fallbackYear: number = new Date().getFullYear()): CalendarEvent[] {
  const normalized = normalizeOCRText(text);
  const events: CalendarEvent[] = [];
  const seen = new Set<string>();

  const messagePattern = /(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?\s*,?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*(\d{1,2})\s*,?\s*(\d{4})?\s*from\s*(\d{1,2}:\d{2})\s*(?:to|-)\s*(\d{1,2}:\d{2})/gi;

  let match = messagePattern.exec(normalized);
  while (match) {
    const monthToken = match[1].slice(0, 3).toLowerCase();
    const month = MONTH_ABBREVIATIONS[monthToken];
    const day = Number.parseInt(match[2], 10);
    const year = match[3] ? Number.parseInt(match[3], 10) : fallbackYear;
    const startTime = normalizeTime(match[4]);
    const endTime = normalizeTime(match[5]);

    if (Number.isInteger(month) && isValidDate(year, month, day) && startTime && endTime) {
      const date = new Date(year, month, day);
      const dedupeKey = `${date.toDateString()}-${startTime}-${endTime}`;

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        events.push({
          id: `shift-${year}-${month + 1}-${day}-${startTime}-${endTime}`,
          title: 'Amazon Shift',
          date,
          startTime,
          endTime,
        });
      }
    }

    match = messagePattern.exec(normalized);
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime() || (a.startTime || '').localeCompare(b.startTime || ''));
}

function normalizeOCRText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[|]/g, ' ')
    .replace(/t[o0](?=\s*\d{1,2}[:.;][0-9Oo]{2})/gi, 'to')
    .replace(/([0-2]?\d)[:.;]([0-9Oo]{2})/g, (_fullMatch, hours: string, minutes: string) => {
      return `${hours}:${minutes.replace(/[oO]/g, '0')}`;
    })
    .replace(/\s+from\s*/gi, ' from ')
    .replace(/\s+to\s*/gi, ' to ')
    .replace(/from(?=\d)/gi, 'from ')
    .replace(/to(?=\d)/gi, 'to ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeTime(value: string): string | null {
  const sanitized = value
    .replace(/[oO]/g, '0')
    .replace(/[.;]/g, ':')
    .replace(/\s+/g, '');

  const match = sanitized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function isValidDate(year: number, monthIndex: number, day: number): boolean {
  if (day < 1 || day > 31) return false;

  const date = new Date(year, monthIndex, day);
  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
}
