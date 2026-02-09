'use client';

import React, { useState, useCallback } from 'react';
import { ColorDetectionFactory, StrategyType } from '@/lib';
import { CalendarType } from '@/types/calendar';

interface ImageUploaderProps {
  onImageUpload: (file: File, strategy: StrategyType, calendarType: CalendarType, imagePreview: string) => void;
  selectedStrategy: StrategyType;
  onStrategyChange: (strategy: StrategyType) => void;
  selectedCalendarType: CalendarType;
  onCalendarTypeChange: (calendarType: CalendarType) => void;
  isProcessing: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  selectedStrategy,
  onStrategyChange,
  selectedCalendarType,
  onCalendarTypeChange,
  isProcessing
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [selectedStrategy]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onImageUpload(file, selectedStrategy, selectedCalendarType, result);
    };
    reader.readAsDataURL(file);
  };

  const strategies = ColorDetectionFactory.getAllStrategies();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Calendar Image</h2>
        
        {/* Strategy Selector - Only in dev mode */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detection Strategy (Dev Mode)
            </label>
            <select
              value={selectedStrategy}
              onChange={(e) => onStrategyChange(e.target.value as StrategyType)}
              disabled={isProcessing}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {strategies.map((strategy) => (
                <option key={strategy.type} value={strategy.type}>
                  {strategy.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {selectedStrategy === 'canvas' 
                ? 'Canvas: Fast processing, works best with clear red text on white background'
                : 'OpenCV: More robust for complex colors and varying lighting conditions (slower to load)'}
            </p>
          </div>
        )}

        {/* Calendar Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Calendar Type
          </label>
          <select
            value={selectedCalendarType}
            onChange={(e) => onCalendarTypeChange(e.target.value as CalendarType)}
            disabled={isProcessing}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="standard">Standard Calendar</option>
            <option value="jojo">jojo💗 mode (shifts)</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            {selectedCalendarType === 'standard' 
              ? 'Standard: Extracts events with titles from calendar text'
              : 'jojo💗 mode: Detects shifts (C/moon = nightshift, other red = dayshift)'}
          </p>
        </div>

        {/* Drag and Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            disabled={isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-gray-600">
              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
            </div>
            <p className="text-sm text-gray-500">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        </div>

        {/* Image Preview */}
        {preview && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              <img
                src={preview}
                alt="Calendar preview"
                className="max-w-full h-auto max-h-96 mx-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
