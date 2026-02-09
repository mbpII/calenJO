'use client';

import React, { useState, useCallback } from 'react';
import { ImageUploader } from './ImageUploader';
import { EventEditor } from './EventEditor';
import { 
  ColorDetectionFactory, 
  StrategyType, 
  extractTextFromRegions,
  parseCalendarFromOCR,
  generateICS,
  downloadICSFile
} from '@/lib';
import { useStrategyState } from '@/hooks';
import { CalendarEvent, ProcessingState, CalendarType } from '@/types/calendar';

export const CalendarProcessor: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useStrategyState();
  const [selectedCalendarType, setSelectedCalendarType] = useState<CalendarType>('standard');
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = useCallback(async (file: File, strategy: StrategyType, calendarType: CalendarType, imagePreview: string) => {
    try {
      // Step 1: Load image and detect red regions
      setProcessingState({
        status: 'detecting',
        progress: 10,
        message: 'Detecting red dates in calendar...'
      });

      const img = await loadImage(imagePreview);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Detect red regions
      const detectionStrategy = ColorDetectionFactory.getStrategy(strategy);
      const regions = await detectionStrategy.detectRedRegions(imageData);
      
      if (regions.length === 0) {
        setProcessingState({
          status: 'error',
          progress: 0,
          message: 'No red dates detected. Try the OpenCV strategy or check your image.'
        });
        return;
      }

      setProcessingState({
        status: 'extracting',
        progress: 40,
        message: `Found ${regions.length} red regions. Extracting text with OCR...`
      });

      // Step 2: OCR on red regions
      const ocrResults = await extractTextFromRegions(file, regions);

      setProcessingState({
        status: 'parsing',
        progress: 70,
        message: `Extracted ${ocrResults.length} text regions. Parsing events...`
      });

      // Step 3: Parse calendar events
      const parsedData = parseCalendarFromOCR(ocrResults, year, month);
      
      setEvents(parsedData.events);
      setProcessingState({
        status: 'complete',
        progress: 100,
        message: `Successfully extracted ${parsedData.events.length} events!`
      });

    } catch (error) {
      console.error('Processing error:', error);
      setProcessingState({
        status: 'error',
        progress: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      });
    }
  }, [year, month]);

  const handleGenerateICS = async () => {
    setIsGenerating(true);
    try {
      const icsContent = generateICS({
        year,
        month,
        events
      });
      
      const filename = `calendar-events-${year}-${month.toString().padStart(2, '0')}.ics`;
      downloadICSFile(icsContent, filename);
      
      setProcessingState({
        status: 'complete',
        progress: 100,
        message: 'ICS file downloaded successfully!'
      });
    } catch (error) {
      setProcessingState({
        status: 'error',
        progress: 0,
        message: `Failed to generate ICS: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const isProcessing = processingState.status !== 'idle' && 
                       processingState.status !== 'complete' && 
                       processingState.status !== 'error';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ImageUploader
        onImageUpload={handleImageUpload}
        selectedStrategy={selectedStrategy}
        onStrategyChange={setSelectedStrategy}
        selectedCalendarType={selectedCalendarType}
        onCalendarTypeChange={setSelectedCalendarType}
        isProcessing={isProcessing}
      />

      {/* Progress Indicator */}
      {(isProcessing || processingState.status === 'error') && (
        <div className={`rounded-lg p-4 ${
          processingState.status === 'error' 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center space-x-3">
            {isProcessing && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
            {processingState.status === 'error' && (
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                processingState.status === 'error' ? 'text-red-800' : 'text-blue-800'
              }`}>
                {processingState.message}
              </p>
              {isProcessing && (
                <div className="mt-2">
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingState.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Editor */}
      {(events.length > 0 || processingState.status === 'complete') && (
        <EventEditor
          events={events}
          onEventsChange={setEvents}
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onGenerateICS={handleGenerateICS}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
};
