import { CalendarEvent, ParsedCalendarData, CalendarType } from '@/types/calendar';
import { OCRResult } from './ocr';

interface DateInfo {
  day: number;
  weekIndex: number;
  y: number;
}

export function parseCalendarFromOCR(
  ocrResults: OCRResult[],
  year: number,
  month: number,
  calendarType: CalendarType = 'standard'
): ParsedCalendarData {
  const events: CalendarEvent[] = [];
  
  // Sort regions by Y position (top to bottom), then X (left to right)
  const sortedResults = [...ocrResults].sort((a, b) => {
    const yDiff = a.region.y - b.region.y;
    if (Math.abs(yDiff) > 50) return yDiff; // Different rows
    return a.region.x - b.region.x; // Same row, sort left to right
  });
  
  // Assign week indices based on Y position
  const datesWithWeeks = assignWeekIndices(sortedResults);
  
  // Calculate expected calendar layout
  const calendarLayout = calculateCalendarLayout(year, month);
  
  // Extract date numbers from text
  for (let i = 0; i < sortedResults.length; i++) {
    const result = sortedResults[i];
    const text = result.text;
    
    // Try to extract date number (1-31)
    const dateMatch = text.match(/\b(\d{1,2})\b/);
    if (!dateMatch) continue;
    
    const day = parseInt(dateMatch[1], 10);
    if (day < 1 || day > 31) continue;
    
    const dateInfo = datesWithWeeks.get(i);
    if (!dateInfo) continue;
    
    // Determine actual month/year based on position
    const { actualYear, actualMonth, actualDay } = determineActualDate(
      day,
      dateInfo.weekIndex,
      calendarLayout,
      year,
      month
    );
    
    // Look for event text in the same region or nearby
    let eventTitle = '';
    
    // Check if there's text after the date number in the same result
    const afterDate = text.replace(/\b\d{1,2}\b/, '').trim();
    if (afterDate.length > 2) {
      eventTitle = cleanEventText(afterDate);
    }
    
    // In standard mode: use smarter proximity check (Option B)
    // In jojo mode: skip adjacent region lookup entirely
    if (!eventTitle && calendarType === 'standard' && i + 1 < sortedResults.length) {
      const nextResult = sortedResults[i + 1];
      const yDiff = Math.abs(nextResult.region.y - result.region.y);
      const xDiff = Math.abs(nextResult.region.x - result.region.x);
      
      // SMART CHECK: Must be same calendar cell (same row, nearby column)
      // AND must contain actual text (not just another number)
      const isSameRow = yDiff < 30;  // Tighter Y threshold
      const isNearbyX = xDiff < 150;  // Tighter X threshold
      const nextText = nextResult.text;
      const isNotJustANumber = !nextText.match(/^\d{1,2}$/);
      
      if (isSameRow && isNearbyX && isNotJustANumber) {
        eventTitle = cleanEventText(nextText);
      }
    }
    
    // jojo💗 mode: All red regions become shift events
    if (calendarType === 'jojo') {
      // Check for C/nightshift indicator
      const hasC = /C/i.test(text);
      const hasMoon = /[🌙☾🌛🌜]/u.test(text);
      
      if (hasC || hasMoon) {
        eventTitle = 'nightshift';
      } else {
        eventTitle = eventTitle || 'dayshift';
      }
    }
    
    if (eventTitle) {
      const event: CalendarEvent = {
        id: `event-${actualDay}-${actualMonth}-${actualYear}-${Date.now()}`,
        title: eventTitle,
        date: new Date(actualYear, actualMonth - 1, actualDay),
      };
      
      // Try to extract time from the title
      const timeInfo = extractTimeFromText(eventTitle);
      if (timeInfo) {
        event.startTime = timeInfo.startTime;
        event.endTime = timeInfo.endTime;
        // Remove time from title for cleaner display
        event.title = eventTitle.replace(/\d{1,2}:\d{2}\s*(AM|PM|am|pm)?/gi, '').trim();
      }
      
      events.push(event);
    }
  }
  
  return {
    year,
    month,
    events
  };
}

function assignWeekIndices(results: OCRResult[]): Map<number, DateInfo> {
  const dateMap = new Map<number, DateInfo>();
  
  if (results.length === 0) return dateMap;
  
  // Group by Y position to identify calendar rows
  const yPositions: number[] = [];
  for (const result of results) {
    const dayMatch = result.text.match(/\b(\d{1,2})\b/);
    if (dayMatch) {
      yPositions.push(result.region.y);
    }
  }
  
  if (yPositions.length === 0) return dateMap;
  
  // Find unique Y positions (rows)
  yPositions.sort((a, b) => a - b);
  const rows: number[] = [yPositions[0]];
  
  for (let i = 1; i < yPositions.length; i++) {
    const lastRow = rows[rows.length - 1];
    if (Math.abs(yPositions[i] - lastRow) > 50) {
      rows.push(yPositions[i]);
    }
  }
  
  // Assign week indices (skip header rows if any)
  // Calendar typically has 4-6 rows of dates
  const weekOffset = rows.length > 6 ? rows.length - 6 : 0;
  
  let resultIndex = 0;
  for (const result of results) {
    const dayMatch = result.text.match(/\b(\d{1,2})\b/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10);
      const rowIndex = rows.findIndex(y => Math.abs(y - result.region.y) < 50);
      const weekIndex = Math.max(0, rowIndex - weekOffset);
      
      dateMap.set(resultIndex, {
        day,
        weekIndex,
        y: result.region.y
      });
    }
    resultIndex++;
  }
  
  return dateMap;
}

interface CalendarLayout {
  firstDayOfMonth: number; // 0 = Sunday, 1 = Monday, etc.
  daysInMonth: number;
  daysInPrevMonth: number;
  weeks: number[][]; // Each week contains the day numbers that should appear
}

function calculateCalendarLayout(year: number, month: number): CalendarLayout {
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
  
  // Build calendar grid
  const weeks: number[][] = [];
  let currentWeek: number[] = [];
  
  // Add days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    currentWeek.unshift(daysInPrevMonth - i);
  }
  
  // Add days from current month
  for (let day = 1; day <= daysInMonth; day++) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  
  // Add days from next month to complete the last week
  let nextMonthDay = 1;
  while (currentWeek.length < 7) {
    currentWeek.push(nextMonthDay++);
  }
  weeks.push(currentWeek);
  
  // Add more weeks if needed (calendars usually show 6 weeks)
  while (weeks.length < 6) {
    const newWeek: number[] = [];
    for (let i = 0; i < 7; i++) {
      newWeek.push(nextMonthDay++);
    }
    weeks.push(newWeek);
  }
  
  return {
    firstDayOfMonth,
    daysInMonth,
    daysInPrevMonth,
    weeks
  };
}

function determineActualDate(
  detectedDay: number,
  weekIndex: number,
  layout: CalendarLayout,
  calendarYear: number,
  calendarMonth: number
): { actualYear: number; actualMonth: number; actualDay: number } {
  // Get the expected days for this week
  const weekDays = layout.weeks[weekIndex];
  if (!weekDays) {
    return { actualYear: calendarYear, actualMonth: calendarMonth, actualDay: detectedDay };
  }
  
  // Find the position of the detected day in this week
  const dayIndex = weekDays.indexOf(detectedDay);
  if (dayIndex === -1) {
    return { actualYear: calendarYear, actualMonth: calendarMonth, actualDay: detectedDay };
  }
  
  // Determine which month this day belongs to
  let actualYear = calendarYear;
  let actualMonth = calendarMonth;
  
  if (weekIndex === 0) {
    // First week - check if this is from previous month
    const lastDayOfPrevMonthWeek = layout.firstDayOfMonth - 1;
    if (dayIndex <= lastDayOfPrevMonthWeek && detectedDay > 20) {
      // This is from the previous month (large day numbers in first week)
      actualMonth = calendarMonth - 1;
      if (actualMonth === 0) {
        actualMonth = 12;
        actualYear = calendarYear - 1;
      }
    }
  } else if (weekIndex >= layout.weeks.length - 2) {
    // Last weeks - check if this is from next month
    const lastDayOfMonthIndex = weekDays.indexOf(layout.daysInMonth);
    if (lastDayOfMonthIndex !== -1 && dayIndex > lastDayOfMonthIndex) {
      // This is from the next month (after the last day of current month)
      actualMonth = calendarMonth + 1;
      if (actualMonth === 13) {
        actualMonth = 1;
        actualYear = calendarYear + 1;
      }
    } else if (detectedDay < 15 && weekIndex > 0) {
      // Small day number in later week suggests next month
      const prevWeek = layout.weeks[weekIndex - 1];
      const hasCurrentMonthDays = prevWeek.some(d => d >= 20 || d <= layout.daysInMonth);
      if (hasCurrentMonthDays) {
        actualMonth = calendarMonth + 1;
        if (actualMonth === 13) {
          actualMonth = 1;
          actualYear = calendarYear + 1;
        }
      }
    }
  }
  
  return { actualYear, actualMonth, actualDay: detectedDay };
}

function cleanEventText(text: string): string {
  return text
    .replace(/[^\w\s\-:]/g, '') // Remove special chars except : and -
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function extractTimeFromText(text: string): { startTime: string; endTime?: string } | null {
  // Match patterns like "9:00 AM", "2:30PM", "14:00"
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/gi;
  const matches = [...text.matchAll(timeRegex)];
  
  if (matches.length === 0) return null;
  
  const times = matches.map(match => {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  });
  
  return {
    startTime: times[0],
    endTime: times[1]
  };
}

export function formatDateForICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
