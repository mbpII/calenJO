import { CalendarProcessor } from '@/components/CalendarProcessor';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Calendar to .ics Converter
          </h1>
          <p className="text-lg text-gray-600">
            Upload a calendar image, detect red-marked dates, and convert to Apple Calendar format
          </p>
        </div>
        <CalendarProcessor />
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Supports traditional calendar images with red dates marked.</p>
          <p className="mt-1">
            Uses OCR to extract events • Downloads standard .ics format • Compatible with Apple Calendar
          </p>
        </div>
      </div>
    </main>
  );
}
