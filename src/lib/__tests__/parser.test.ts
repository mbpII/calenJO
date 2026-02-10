import { describe, it, expect } from 'vitest';
import { parseCalendarFromOCR } from '../parser';
import { OCRResult } from '../ocr';

// Helper to create OCR results with specific positions
function createOCRResult(text: string, x: number, y: number): OCRResult {
  return {
    text,
    region: { x, y, width: 50, height: 50 },
    confidence: 90
  };
}

// Helper to ensure all 6 calendar weeks are present for proper week index assignment
// This creates dummy rows at standard calendar Y positions (150, 200, 250, 300, 350, 400)
function withCalendarStructure(results: OCRResult[]): OCRResult[] {
  const baseResults: OCRResult[] = [
    createOCRResult('1', 0, 150),   // Week 0
    createOCRResult('1', 0, 200), // Week 1
    createOCRResult('1', 0, 250), // Week 2
    createOCRResult('1', 0, 300), // Week 3
    createOCRResult('1', 0, 350), // Week 4
    createOCRResult('1', 0, 400), // Week 5
  ];
  return [...baseResults, ...results];
}

describe('parseCalendarFromOCR - Month Overflow Detection', () => {
  describe('Current Month Dates (Baseline)', () => {
    it('should parse mid-month date correctly', () => {
      // February 2024, day 15 in the middle of the calendar
      // Week 3 (0-indexed: week 2)
      const ocrResults: OCRResult[] = [
        createOCRResult('15 Meeting', 200, 250) // Week 3 (row 2)
      ];

      const result = parseCalendarFromOCR(ocrResults, 2024, 2);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].date).toEqual(new Date(2024, 1, 15)); // Feb 15, 2024
    });

    it('should parse first day of month correctly', () => {
      // March 2024, day 1
      // First week row
      const ocrResults: OCRResult[] = [
        createOCRResult('1 Start', 100, 150) // Week 1 (row 0)
      ];

      const result = parseCalendarFromOCR(ocrResults, 2024, 3);

      expect(result.events[0].date).toEqual(new Date(2024, 2, 1)); // Mar 1, 2024
    });

    it('should parse last day of month correctly', () => {
      // February 2024, day 29 (leap year)
      // Feb 2024 has 5 weeks (weeks 0-4), so week 4 is the last week
      const ocrResults = withCalendarStructure([
        createOCRResult('29 End', 300, 350) // Week 5 (row 4)
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 2);

      expect(result.events[0].date).toEqual(new Date(2024, 1, 29)); // Feb 29, 2024
    });
  });

  describe('Previous Month Overflow', () => {
    it('should detect late dates in first week as previous month', () => {
      // February 2024 starts on Thursday (Feb 1 = day 4 of week)
      // So first week shows: Jan 28, 29, 30, 31, Feb 1, 2, 3
      const ocrResults: OCRResult[] = [
        createOCRResult('31 Task', 100, 150),  // Position: Tuesday (day 2)
        createOCRResult('1 Work', 150, 150),  // Position: Wednesday (day 3)
        createOCRResult('2 Plan', 200, 150)   // Position: Thursday (day 4)
      ];

      const result = parseCalendarFromOCR(ocrResults, 2024, 2);

      expect(result.events).toHaveLength(3);
      expect(result.events[0].date).toEqual(new Date(2024, 0, 31)); // Jan 31
      expect(result.events[1].date).toEqual(new Date(2024, 1, 1));  // Feb 1
      expect(result.events[2].date).toEqual(new Date(2024, 1, 2));  // Feb 2
    });

    it('should handle large day numbers (28-31) in first week as previous month', () => {
      // March 2024 starts on Friday
      // First week shows: Feb 25, 26, 27, 28, 29, Mar 1, 2
      const ocrResults = withCalendarStructure([
        createOCRResult('28 Event', 150, 150),
        createOCRResult('29 Task', 200, 150)
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 3);

      expect(result.events[0].date).toEqual(new Date(2024, 1, 28)); // Feb 28
      expect(result.events[1].date).toEqual(new Date(2024, 1, 29)); // Feb 29 (leap year!)
    });
  });

  describe('Next Month Overflow', () => {
    it('should detect early dates in last week as next month', () => {
      // February 2024 ends on Thursday (Feb 29)
      // Calendar layout for Feb 2024:
      // Week 0 (y=150): [28, 29, 30, 31, 1, 2, 3] - Jan overflow + Feb start
      // Week 1 (y=200): [4, 5, 6, 7, 8, 9, 10]
      // Week 2 (y=250): [11, 12, 13, 14, 15, 16, 17]
      // Week 3 (y=300): [18, 19, 20, 21, 22, 23, 24]
      // Week 4 (y=350): [25, 26, 27, 28, 29, 1, 2] - Feb end + Mar overflow
      // Week 5 (y=400): [3, 4, 5, 6, 7, 8, 9] - More Mar overflow
      const ocrResults = withCalendarStructure([
        createOCRResult('29 Review', 250, 350),  // Week 4, position 4
        createOCRResult('1 Plan', 300, 350),     // Week 4, position 5 (after Feb 29)
        createOCRResult('2 Start', 350, 350)     // Week 4, position 6 (after Feb 29)
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 2);

      expect(result.events).toHaveLength(3);
      expect(result.events[0].date).toEqual(new Date(2024, 1, 29)); // Feb 29
      expect(result.events[1].date).toEqual(new Date(2024, 2, 1));  // Mar 1
      expect(result.events[2].date).toEqual(new Date(2024, 2, 2));  // Mar 2
    });

    it('should detect multiple next month dates', () => {
      // April 2024 ends on Tuesday (April 30)
      // Week 4 will have Apr 30 followed by May 1, 2, 3, 4
      const ocrResults = withCalendarStructure([
        createOCRResult('30 Review', 200, 350), // Apr 30 in week 4
        createOCRResult('1 Plan', 300, 350),    // May 1 in week 4, after Apr 30
        createOCRResult('2 Start', 350, 350),   // May 2 in week 4, after Apr 30
        createOCRResult('3 Work', 400, 350)     // May 3 in week 4, after Apr 30
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 4);

      expect(result.events[0].date).toEqual(new Date(2024, 3, 30)); // Apr 30
      expect(result.events[1].date).toEqual(new Date(2024, 4, 1));  // May 1
      expect(result.events[2].date).toEqual(new Date(2024, 4, 2));  // May 2
      expect(result.events[3].date).toEqual(new Date(2024, 4, 3));  // May 3
    });
  });

  describe('Year Boundary Cases', () => {
    it('should handle January with December overflow', () => {
      // January 2024 starts on Monday
      // First week: Dec 31, Jan 1, 2, 3, 4, 5, 6
      const ocrResults = withCalendarStructure([
        createOCRResult('31 Task', 50, 150),  // Dec 31, 2023
        createOCRResult('1 Work', 100, 150)   // Jan 1, 2024
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 1);

      expect(result.events[0].date).toEqual(new Date(2023, 11, 31)); // Dec 31, 2023
      expect(result.events[1].date).toEqual(new Date(2024, 0, 1));  // Jan 1, 2024
    });

    it('should handle December with January overflow', () => {
      // December 2024 ends on Tuesday (Dec 31)
      // Week 4: [29, 30, 31, 1, 2, 3, 4] - Dec end + Jan overflow
      const ocrResults = withCalendarStructure([
        createOCRResult('31 Review', 200, 350), // Dec 31, 2024 in week 4
        createOCRResult('1 Plan', 300, 350),    // Jan 1, 2025 in week 4, after Dec 31
        createOCRResult('2 Start', 350, 350)    // Jan 2, 2025 in week 4, after Dec 31
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 12);

      expect(result.events[0].date).toEqual(new Date(2024, 11, 31)); // Dec 31, 2024
      expect(result.events[1].date).toEqual(new Date(2025, 0, 1));  // Jan 1, 2025
      expect(result.events[2].date).toEqual(new Date(2025, 0, 2));  // Jan 2, 2025
    });

    it('should correctly handle year transition with multiple overflow dates', () => {
      // December 2024 with overflow to January 2025
      // Week 5 has more Jan overflow days
      const ocrResults = withCalendarStructure([
        createOCRResult('1 Plan', 100, 400),    // Jan 1, 2025 in week 5
        createOCRResult('2 Work', 150, 400),    // Jan 2, 2025 in week 5
        createOCRResult('3 Task', 200, 400),    // Jan 3, 2025 in week 5
        createOCRResult('4 Start', 250, 400)    // Jan 4, 2025 in week 5
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 12);

      expect(result.events.every(e => e.date.getFullYear() === 2025)).toBe(true);
      expect(result.events[0].date).toEqual(new Date(2025, 0, 1));
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed overflow dates across weeks', () => {
      // February 2024 with both previous and next month overflow
      // Week 0 (y=150): [28, 29, 30, 31, 1, 2, 3] - Jan overflow + Feb start
      // Week 2 (y=250): [11, 12, 13, 14, 15, 16, 17] - Feb middle
      // Week 4 (y=350): [25, 26, 27, 28, 29, 1, 2] - Feb end + Mar overflow
      const ocrResults = withCalendarStructure([
        createOCRResult('31 Task', 150, 150),   // Week 0: Jan 31 (large number in first week)
        createOCRResult('1 Work', 200, 150),    // Week 0: Feb 1
        createOCRResult('15 Meeting', 200, 250), // Week 2: Feb 15 (current month)
        createOCRResult('29 Review', 250, 350), // Week 4: Feb 29
        createOCRResult('1 Plan', 300, 350)     // Week 4: Mar 1 (after Feb 29)
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 2);

      expect(result.events).toHaveLength(5);
      expect(result.events[0].date).toEqual(new Date(2024, 0, 31)); // Jan
      expect(result.events[1].date).toEqual(new Date(2024, 1, 1));  // Feb
      expect(result.events[2].date).toEqual(new Date(2024, 1, 15)); // Feb
      expect(result.events[3].date).toEqual(new Date(2024, 1, 29)); // Feb
      expect(result.events[4].date).toEqual(new Date(2024, 2, 1));  // Mar
    });

    it('should handle calendar with events on overflow dates', () => {
      // Simulate: "31 Dentist" in first week (Jan 31 event in Feb calendar)
      const ocrResults = withCalendarStructure([
        createOCRResult('31 Dentist', 150, 150),
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 2);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].date).toEqual(new Date(2024, 0, 31)); // Jan 31
      expect(result.events[0].title).toContain('Dentist');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty OCR results', () => {
      const result = parseCalendarFromOCR([], 2024, 2);
      expect(result.events).toHaveLength(0);
      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
    });

    it('should keep low day numbers in current month before cutoff', () => {
      const ocrResults = withCalendarStructure([
        createOCRResult('2 Task', 100, 200)
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 2);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].date).toEqual(new Date(2024, 1, 2));
    });

    it('should handle non-date text', () => {
      const ocrResults = withCalendarStructure([
        createOCRResult('Meeting at 3pm', 200, 200),
        createOCRResult('Lunch', 300, 200)
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 2);
      expect(result.events).toHaveLength(0);
    });

    it('should handle single-digit dates in last week correctly', () => {
      // May 2024 ends on Friday (May 31)
      // Week 4: [26, 27, 28, 29, 30, 31, 1] - May end + Jun 1 overflow
      const ocrResults = withCalendarStructure([
        createOCRResult('1 Start', 350, 350) // Jun 1 in week 4, after May 31
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 5);

      expect(result.events[0].date).toEqual(new Date(2024, 5, 1)); // Jun 1
    });

    it('should handle 30-day months correctly', () => {
      // April 2024 (30 days)
      // Week 4: [28, 29, 30, 1, 2, 3, 4] - Apr end + May overflow
      const ocrResults = withCalendarStructure([
        createOCRResult('30 End', 200, 350), // Apr 30 in week 4
        createOCRResult('1 Start', 300, 350)   // May 1 in week 4, after Apr 30
      ]);

      const result = parseCalendarFromOCR(ocrResults, 2024, 4);

      expect(result.events[0].date).toEqual(new Date(2024, 3, 30)); // Apr 30
      expect(result.events[1].date).toEqual(new Date(2024, 4, 1));  // May 1
    });
  });
});
