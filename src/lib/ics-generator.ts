import { createEvents } from 'ics';
import { CalendarEvent, ParsedCalendarData } from '@/types/calendar';

export function generateICS(calendarData: ParsedCalendarData): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = calendarData.events.map(event => {
    const icsEvent: any = {
      start: [
        event.date.getFullYear(),
        event.date.getMonth() + 1,
        event.date.getDate()
      ],
      title: event.title,
      description: `Extracted from calendar image`,
    };
    
    // If we have a start time, add it and optionally an end time
    if (event.startTime) {
      const [hours, minutes] = event.startTime.split(':').map(Number);
      icsEvent.start = [
        event.date.getFullYear(),
        event.date.getMonth() + 1,
        event.date.getDate(),
        hours,
        minutes
      ];
      
      // If we have an end time, add it; otherwise default to 1 hour duration
      if (event.endTime) {
        const [endHours, endMinutes] = event.endTime.split(':').map(Number);
        icsEvent.end = [
          event.date.getFullYear(),
          event.date.getMonth() + 1,
          event.date.getDate(),
          endHours,
          endMinutes
        ];
      } else {
        // Default 1 hour duration if no end time
        icsEvent.duration = { hours: 1 };
      }
    }
    
    return icsEvent;
  });
  
  const { value, error } = createEvents(events);
  
  if (error) {
    throw new Error(`ICS generation failed: ${error}`);
  }
  
  return value || '';
}

export function downloadICSFile(icsContent: string, filename: string = 'calendar-events.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
