import { CalendarEvent, ParsedCalendarData, CalendarType } from '@/types/calendar';
import { OCRResult } from './ocr';

// Month context enum for tracking which month a date belongs to
enum MonthContext {
  PREVIOUS = 'previous',
  CURRENT = 'current',
  NEXT = 'next'
}

// Simple month tracker - detects month transitions based on day progression
class MonthTracker {
  private lastDay: number = 0;
  private context: MonthContext = MonthContext.CURRENT;
  private hasTransitionedToCurrent: boolean = false;
  private currentWeek: number = -1;
  
  detectMonth(day: number, weekIndex: number): { context: MonthContext; monthOffset: number } {
    // Reset when entering a new week
    if (weekIndex !== this.currentWeek) {
      this.currentWeek = weekIndex;
      this.lastDay = 0;
    }
    
    // Detect previous month: high days (25-31) at the start
    if (weekIndex === 0 && day >= 25 && this.lastDay === 0) {
      this.context = MonthContext.PREVIOUS;
    }
    // Detect transition to current month: day drops from high (28-31) to low (1-5)
    else if (this.lastDay >= 28 && day <= 5 && !this.hasTransitionedToCurrent) {
      this.context = MonthContext.CURRENT;
      this.hasTransitionedToCurrent = true;
    }
    // Detect transition to next month: day drops in later weeks after we've been in current month
    else if (this.lastDay >= 25 && day <= 5 && weekIndex >= 3 && this.hasTransitionedToCurrent) {
      this.context = MonthContext.NEXT;
    }
    
    this.lastDay = day;
    
    // Convert context to month offset
    let monthOffset = 0;
    if (this.context === MonthContext.PREVIOUS) monthOffset = -1;
    else if (this.context === MonthContext.NEXT) monthOffset = 1;
    
    return { context: this.context, monthOffset };
  }
  
  reset(): void {
    this.lastDay = 0;
    this.context = MonthContext.CURRENT;
    this.hasTransitionedToCurrent = false;
    this.currentWeek = -1;
  }
}

interface DateInfo {
  day: number;
  weekIndex: number;
  y: number;
  resultIndex: number;
}

export function parseCalendarFromOCR(
  ocrResults: OCRResult[],
  year: number,
  month: number,
  calendarType: CalendarType = 'standard'
): ParsedCalendarData {
  const events: CalendarEvent[] = [];
  const monthTracker = new MonthTracker();
  
  // Sort regions by Y position (top to bottom), then X (left to right)
  const sortedResults = [...ocrResults].sort((a, b) => {
    const yDiff = a.region.y - b.region.y;
    if (Math.abs(yDiff) > 50) return yDiff; // Different rows
    return a.region.x - b.region.x; // Same row, sort left to right
  });
  
  // Assign week indices based on Y position
  const datesWithWeeks = assignWeekIndices(sortedResults);
  
  // Track month transitions as we process each date
  let currentMonthOffset = 0;
  let lastWeekIndex = -1;
  
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
    
    // Detect which month this day belongs to
    const { monthOffset } = monthTracker.detectMonth(day, dateInfo.weekIndex);
    currentMonthOffset = monthOffset;
    
    // Calculate actual year and month
    let actualYear = year;
    let actualMonth = month + currentMonthOffset;
    
    // Handle year boundaries
    if (actualMonth === 0) {
      actualMonth = 12;
      actualYear = year - 1;
    } else if (actualMonth === 13) {
      actualMonth = 1;
      actualYear = year + 1;
    }
    
    // Look for event text in the same region or nearby
    let eventTitle = '';
    
    // Check if there's text after the date number in the same result
    const afterDate = text.replace(/\b\d{1,2}\b/, '').trim();
    if (afterDate.length > 1) {
      eventTitle = cleanEventText(afterDate);
      console.log(`📝 Found event text in same region: "${eventTitle}" from "${text}"`);
    }
    
    // In standard mode: use smarter proximity check
    // In jojo mode: skip adjacent region lookup entirely
    if (!eventTitle && calendarType === 'standard' && i + 1 < sortedResults.length) {
      const nextResult = sortedResults[i + 1];
      const yDiff = Math.abs(nextResult.region.y - result.region.y);
      const xDiff = Math.abs(nextResult.region.x - result.region.x);
      
      // SMART CHECK: Must be same calendar cell (same row, nearby column)
      // OR text vertically below the date (common in calendar layouts)
      // AND must contain actual text (not just another number)
      const isSameRow = yDiff < 60;  // Allow same calendar row
      const isDirectlyBelow = yDiff > 0 && yDiff < 100 && xDiff < 50; // Text below date
      const isNearbyX = xDiff < 150;  // Nearby column
      const nextText = nextResult.text;
      const isNotJustANumber = !nextText.match(/^\d{1,2}$/);
      
      if ((isSameRow || isDirectlyBelow) && isNearbyX && isNotJustANumber) {
        eventTitle = cleanEventText(nextText);
        console.log(`📝 Found event text in nearby region: "${eventTitle}"`);
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
        id: `event-${day}-${actualMonth}-${actualYear}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: eventTitle,
        date: new Date(actualYear, actualMonth - 1, day),
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
      
      // Log for debugging
      console.log(`📅 Detected: ${actualMonth}/${day}/${actualYear} - "${eventTitle}" (${monthOffset > 0 ? 'next' : monthOffset < 0 ? 'prev' : 'current'} month)`);
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
        y: result.region.y,
        resultIndex
      });
    }
    resultIndex++;
  }
  
  return dateMap;
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
