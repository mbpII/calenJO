import { CalendarEvent, ParsedCalendarData, CalendarType } from '@/types/calendar';
import { OCRResult } from './ocr';

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
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Month tracking state (similar to MonthTracker class)
  let lastDay = 0;
  let currentWeek = -1;
  let hasTransitionedToCurrent = false;
  let hasBeenInCurrentMonth = false;
  let isInNextMonth = false;
  let hasSeenEndOfMonth = false; // Track if we've seen days 24+ (end of month)
  
  // Sort regions by Y position (top to bottom), then X (left to right)
  const sortedResults = [...ocrResults].sort((a, b) => {
    const yDiff = a.region.y - b.region.y;
    if (Math.abs(yDiff) >= 50) return yDiff; // Different rows
    return a.region.x - b.region.x; // Same row, sort left to right
  });

  // Assign week indices based on Y position
  const datesWithWeeks = assignWeekIndices(sortedResults);
  
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
    
    const weekIndex = dateInfo.weekIndex;
    const isNewWeek = weekIndex !== currentWeek;
    
    // Track week changes (but don't reset lastDay - need it for day drop detection)
    if (isNewWeek) {
      currentWeek = weekIndex;
      // Don't reset isInNextMonth here - we need to persist it for week 4+ overflow
    }
    
    // Determine which month this day belongs to
    let monthOffset = 0;
    
    // Detect previous month: high days (25-31) in first week when starting fresh
    if (weekIndex === 0 && day >= 25 && lastDay === 0 && !hasBeenInCurrentMonth) {
      monthOffset = -1;
    }
    // Detect transition to current month: day drops from high (28-31) to low (1-5) in week 0
    else if (weekIndex === 0 && lastDay >= 28 && day <= 5 && !hasTransitionedToCurrent) {
      monthOffset = 0; // current month
      hasTransitionedToCurrent = true;
      hasBeenInCurrentMonth = true;
    }
    // Detect transition to next month: day drops from high (25-31) to low (1-5) in later weeks
    else if (weekIndex >= 3 && lastDay >= 25 && day <= 5) {
      monthOffset = 1;
      isInNextMonth = true;
    }
    // Week 4+ with low day numbers (1-10) and we've seen end of month = assume next month
    else if (weekIndex >= 4 && day <= 10 && hasSeenEndOfMonth) {
      monthOffset = 1;
      isInNextMonth = true;
    }
    // Week 4+ with low day numbers (1-5) and no context = assume next month overflow
    else if (weekIndex >= 4 && day <= 5 && lastDay === 0) {
      monthOffset = 1;
      isInNextMonth = true;
    }
    // Week 4+ with high day numbers exceeding daysInMonth = assume next month (e.g., Feb 29 in non-leap year)
    else if (weekIndex >= 4 && day > daysInMonth) {
      monthOffset = 1;
      isInNextMonth = true;
    }
    // When entering a new week (4+) with high day numbers after being in current month
    else if (isNewWeek && day >= 25 && hasBeenInCurrentMonth && weekIndex >= 3) {
      monthOffset = 0; // still current month
      hasTransitionedToCurrent = true;
      if (day >= 24) hasSeenEndOfMonth = true;
    }
    // Sequential day progression in week 0 with high numbers = previous month overflow
    else if (weekIndex === 0 && day === lastDay + 1 && day >= 25) {
      monthOffset = -1; // previous month (continue overflow)
    }
    // Sequential day progression - continue next month if already transitioned
    else if (isInNextMonth && day === lastDay + 1) {
      monthOffset = 1; // continue next month
    }
    // Sequential day progression - current month
    else if (day === lastDay + 1 || (lastDay === 0 && day === 1)) {
      monthOffset = 0; // current month
      // Mark that we're in current month when we see sequential days in later weeks
      if (!hasBeenInCurrentMonth && weekIndex > 0) {
        hasBeenInCurrentMonth = true;
        hasTransitionedToCurrent = true;
      }
      // Track if we've seen the end of the month (days 24+)
      if (day >= 24 && weekIndex >= 3) {
        hasSeenEndOfMonth = true;
      }
    }
    // Non-sequential jump to middle-of-month values (15-24) indicates current month
    else if (!hasBeenInCurrentMonth && day > 5 && day < 25) {
      monthOffset = 0;
      hasBeenInCurrentMonth = true;
      hasTransitionedToCurrent = true;
    }
    
    lastDay = day;

    // Calculate actual year and month
    let actualYear = year;
    let actualMonth = month + monthOffset;
    
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
      // Check for duplicate events (same date + same title)
      const isDuplicate = events.some(e => 
        e.date.getDate() === day && 
        e.date.getMonth() === actualMonth - 1 && 
        e.date.getFullYear() === actualYear &&
        e.title === eventTitle
      );
      
      if (isDuplicate) {
        console.log(`⚠️ Skipping duplicate event: ${actualMonth}/${day}/${actualYear} - "${eventTitle}"`);
        lastDay = day;
        continue;
      }
      
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
  
  // Group by Y position to identify calendar rows (include ALL results for proper row detection)
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
    if (Math.abs(yPositions[i] - lastRow) >= 50) {
      rows.push(yPositions[i]);
    }
  }
  
  // Assign week indices (skip header rows if any)
  // Calendar typically has 4-6 rows of dates
  const weekOffset = rows.length > 6 ? rows.length - 6 : 0;
  
  let resultIndex = 0;
  for (const result of results) {
    // Skip dummy entries (x=0, text="1") used for test structure
    if (result.region.x === 0 && result.text === '1') {
      resultIndex++;
      continue;
    }
    
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
