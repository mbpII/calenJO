'use client';

import React, { useState, useCallback } from 'react';
import { StrategyType } from '@/lib';
import { CalendarType } from '@/types/calendar';
import { CropScreen } from './CropScreen';

interface ImageUploaderProps {
  onImageUpload: (file: File, strategy: StrategyType, calendarType: CalendarType, imagePreview: string) => void | Promise<void>;
  onShiftScreenshotUpload: (file: File) => void | Promise<void>;
  onShiftTextSubmit: (text: string) => void;
  onClear: () => void;
  selectedStrategy: StrategyType;
  selectedCalendarType: CalendarType;
  isProcessing: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  onShiftScreenshotUpload,
  onShiftTextSubmit,
  onClear,
  selectedStrategy,
  selectedCalendarType,
  isProcessing
}) => {
  const [inputMode, setInputMode] = useState<'calendar' | 'shift'>('calendar');
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showCropScreen, setShowCropScreen] = useState(false);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [shiftText, setShiftText] = useState('');

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setOriginalPreview(result);
      setFile(file);
      if (inputMode === 'calendar') {
        setShowCropScreen(true);
      } else {
        setPreview(result);
      }
    };
    reader.readAsDataURL(file);
  }, [inputMode]);

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
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const [header, data] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  };

  const handleCropComplete = useCallback((croppedImage: string) => {
    const filename = file?.name ? `cropped-${file.name}` : 'cropped-image.png';
    const croppedFile = dataUrlToFile(croppedImage, filename);
    setFile(croppedFile);
    setPreview(croppedImage);
    setShowCropScreen(false);
  }, [file]);

  const handleSkipCrop = useCallback(() => {
    setPreview(originalPreview);
    setShowCropScreen(false);
  }, [originalPreview]);

  const handleCancelCrop = useCallback(() => {
    setShowCropScreen(false);
    setOriginalPreview(null);
    setFile(null);
  }, []);

  const handleProcess = () => {
    if (inputMode === 'calendar' && file && preview) {
      onImageUpload(file, selectedStrategy, selectedCalendarType, preview);
    }

    if (inputMode === 'shift' && file) {
      onShiftScreenshotUpload(file);
    }
  };

  const handleProcessShiftText = () => {
    if (shiftText.trim()) {
      onShiftTextSubmit(shiftText.trim());
    }
  };

  const handleClear = () => {
    setPreview(null);
    setFile(null);
    setOriginalPreview(null);
    setShowCropScreen(false);
    setShiftText('');
    onClear();
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl shadow-xl p-8 card-hover">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Import Source</h2>
        </div>

        <div className="mb-6 p-1 bg-slate-100 rounded-xl inline-flex gap-1">
          <button
            type="button"
            onClick={() => {
              setInputMode('calendar');
              setPreview(null);
              setFile(null);
              setShowCropScreen(false);
              setOriginalPreview(null);
              setShiftText('');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              inputMode === 'calendar'
                ? 'bg-white text-indigo-700 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Calendar Image
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('shift');
              setPreview(null);
              setFile(null);
              setShowCropScreen(false);
              setOriginalPreview(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              inputMode === 'shift'
                ? 'bg-white text-indigo-700 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shift Messages
          </button>
        </div>
        
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
            transition-all duration-300 ease-in-out
            ${dragActive 
              ? 'border-indigo-500 bg-indigo-50/50 shadow-inner' 
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-100/50'}
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
          
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-indigo-600">Click to upload</span>
              <span className="text-slate-500"> or drag and drop</span>
            </div>
            <p className="text-sm text-slate-400">
              {inputMode === 'calendar'
                ? 'Upload a calendar screenshot (PNG, JPG, GIF)'
                : 'Upload a text message screenshot from mobile or desktop'}
            </p>
          </div>
        </div>

        {inputMode === 'shift' && (
          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="shift-text-input">
              Or paste shift messages directly
            </label>
            <textarea
              id="shift-text-input"
              value={shiftText}
              onChange={(e) => setShiftText(e.target.value)}
              placeholder="You have successfully added a shift: Thu, Mar 5, 2026 from 15:30 to 18:00..."
              className="w-full min-h-36 rounded-xl border border-slate-300 p-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isProcessing}
            />
          </div>
        )}

        {preview && (
          <div className="mt-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </h3>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-lg mb-6 bg-slate-100">
              <img
                src={preview}
                alt="Calendar preview"
                className="max-w-full h-auto max-h-80 mx-auto"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-indigo-200"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {inputMode === 'calendar' ? 'Process Calendar' : 'Process Screenshot'}
                  </span>
                )}
              </button>
              <button
                onClick={handleClear}
                disabled={isProcessing}
                className="px-6 py-3 bg-white text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear
                </span>
              </button>
            </div>
          </div>
        )}

        {inputMode === 'shift' && shiftText.trim().length > 0 && (
          <div className="mt-4">
            <button
              onClick={handleProcessShiftText}
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-cyan-200"
            >
              Process Pasted Messages
            </button>
          </div>
        )}
      </div>

      {inputMode === 'calendar' && showCropScreen && originalPreview && (
        <CropScreen
          imageSrc={originalPreview}
          onCropComplete={handleCropComplete}
          onSkip={handleSkipCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  );
};
