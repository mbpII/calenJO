'use client';

import React, { useState } from 'react';
import { CalendarEvent } from '@/types/calendar';

interface EventEditorProps {
  events: CalendarEvent[];
  onEventsChange: (events: CalendarEvent[]) => void;
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onGenerateICS: () => void;
  isGenerating: boolean;
}

export const EventEditor: React.FC<EventEditorProps> = ({
  events,
  onEventsChange,
  year,
  month,
  onYearChange,
  onMonthChange,
  onGenerateICS,
  isGenerating
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEventUpdate = (id: string, updates: Partial<CalendarEvent>) => {
    const updatedEvents = events.map(event =>
      event.id === id ? { ...event, ...updates } : event
    );
    onEventsChange(updatedEvents);
  };

  const handleDeleteEvent = (id: string) => {
    const updatedEvents = events.filter(event => event.id !== id);
    onEventsChange(updatedEvents);
  };

  const handleAddEvent = () => {
    const newEvent: CalendarEvent = {
      id: `event-manual-${Date.now()}`,
      title: 'New Event',
      date: new Date(year, month - 1, 1),
    };
    onEventsChange([...events, newEvent]);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Extracted Events</h2>
        <button
          onClick={handleAddEvent}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
        >
          + Add Event
        </button>
      </div>

      {/* Date Settings */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => onMonthChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {months.map((m, index) => (
              <option key={index} value={index + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No events extracted. Try adjusting your calendar image or detection strategy.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {editingId === event.id ? (
                        <input
                          type="date"
                          value={event.date.toISOString().split('T')[0]}
                          onChange={(e) => handleEventUpdate(event.id, { 
                            date: new Date(e.target.value) 
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        formatDate(event.date)
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {editingId === event.id ? (
                        <input
                          type="text"
                          value={event.title}
                          onChange={(e) => handleEventUpdate(event.id, { 
                            title: e.target.value 
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        event.title
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {editingId === event.id ? (
                        <div className="flex gap-1">
                          <input
                            type="time"
                            value={event.startTime || ''}
                            onChange={(e) => handleEventUpdate(event.id, { 
                              startTime: e.target.value || undefined 
                            })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="self-center">-</span>
                          <input
                            type="time"
                            value={event.endTime || ''}
                            onChange={(e) => handleEventUpdate(event.id, { 
                              endTime: e.target.value || undefined 
                            })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      ) : (
                        event.startTime 
                          ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`
                          : 'All day'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-medium">
                      {editingId === event.id ? (
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-green-600 hover:text-green-900 mr-2"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingId(event.id)}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onGenerateICS}
              disabled={isGenerating || events.length === 0}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : `Download ${events.length} Events as .ics`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
