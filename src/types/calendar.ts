export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
}

export interface ParsedCalendarData {
  year: number;
  month: number;
  events: CalendarEvent[];
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'detecting' | 'extracting' | 'parsing' | 'generating' | 'complete' | 'error';
  progress: number;
  message: string;
}

export type CalendarType = 'standard' | 'jojo';
