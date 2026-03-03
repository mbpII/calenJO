import { describe, it, expect } from 'vitest';
import { parseShiftMessagesFromText } from '../shift-message-parser';

describe('parseShiftMessagesFromText', () => {
  it('parses a standard shift message', () => {
    const input = 'You have successfully added a shift: Thu, Mar 5, 2026 from 15:30 to 18:00. Please review your new schedule at https://atoz.amazon.work/m/abc123';
    const events = parseShiftMessagesFromText(input);

    expect(events).toHaveLength(1);
    expect(events[0].date).toEqual(new Date(2026, 2, 5));
    expect(events[0].startTime).toBe('15:30');
    expect(events[0].endTime).toBe('18:00');
    expect(events[0].title).toBe('Amazon Shift');
  });

  it('parses multiple messages in one text blob', () => {
    const input = `
      You have successfully added a shift: Wed, Mar 4, 2026 from 15:30 to 18:00.
      You have successfully added a shift: Wed, Mar 4, 2026 from 18:30 to 21:45.
      You have successfully added a shift: Fri, Mar 6, 2026 from 11:30 to 14:45.
    `;

    const events = parseShiftMessagesFromText(input);

    expect(events).toHaveLength(3);
    expect(events[0].date).toEqual(new Date(2026, 2, 4));
    expect(events[0].startTime).toBe('15:30');
    expect(events[2].date).toEqual(new Date(2026, 2, 6));
  });

  it('handles wrapped mobile OCR lines and compact tokens', () => {
    const input = `
      You have successfully added a shift: Thu, Mar 5, 2026
      from15:30 to18:00 Please review your new schedule
      at https://atoz.amazon.work/m/test
    `;

    const events = parseShiftMessagesFromText(input);

    expect(events).toHaveLength(1);
    expect(events[0].date).toEqual(new Date(2026, 2, 5));
    expect(events[0].startTime).toBe('15:30');
    expect(events[0].endTime).toBe('18:00');
  });

  it('deduplicates repeated lines from OCR output', () => {
    const line = 'You have successfully added a shift: Mon, Mar 2, 2026 from 11:30 to 14:45.';
    const input = `${line}\n${line}\n${line}`;
    const events = parseShiftMessagesFromText(input);

    expect(events).toHaveLength(1);
  });

  it('parses full weekday names', () => {
    const input = 'You have successfully added a shift: Thursday, Mar 5, 2026 from 15:30 to 18:00.';
    const events = parseShiftMessagesFromText(input);

    expect(events).toHaveLength(1);
    expect(events[0].date).toEqual(new Date(2026, 2, 5));
  });

  it('handles OCR time noise on lower lines', () => {
    const input = 'You have successfully added a shift: Mon, Mar 2, 2026 from 15;30 t0 18:0O.';
    const events = parseShiftMessagesFromText(input);

    expect(events).toHaveLength(1);
    expect(events[0].date).toEqual(new Date(2026, 2, 2));
    expect(events[0].startTime).toBe('15:30');
    expect(events[0].endTime).toBe('18:00');
  });

  it('ignores malformed entries', () => {
    const input = `
      You have successfully added a shift: Fri, Mar 6, 2026 from 11:30 to 14:45.
      You have successfully added a shift: Sat, Mar 7, 2026 from 99:30 to 18:00.
      random text that should not parse
    `;

    const events = parseShiftMessagesFromText(input);
    expect(events).toHaveLength(1);
    expect(events[0].date).toEqual(new Date(2026, 2, 6));
  });
});
