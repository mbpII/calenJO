'use client';

import React, { useState, useCallback } from 'react';
import { StrategyType } from '@/lib';
import { CalendarType } from '@/types/calendar';
import { usePersistentState } from '@/hooks/usePersistentState';
import { CropScreen } from './CropScreen';
import { 
  Button,
  CalendarImage, 
  ShiftMessages, 
  ProcessCalendar, 
  ProcessScreenshot,
  ProcessPastedMessages,
  Clear 
} from './buttons';

interface ImageUploaderProps {
  onImageUpload: (file: File, strategy: StrategyType, calendarType: CalendarType, imagePreview: string) => void | Promise<void>;
  onShiftScreenshotUpload: (files: File[]) => void | Promise<void>;
  onShiftTextSubmit: (text: string) => void;
  onClear: () => void;
  selectedStrategy: StrategyType;
  onStrategyChange: (strategy: StrategyType) => void;
  selectedCalendarType: CalendarType;
  onCalendarTypeChange: (type: CalendarType) => void;
  isProcessing: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  onShiftScreenshotUpload,
  onShiftTextSubmit,
  onClear,
  selectedStrategy,
  onStrategyChange,
  selectedCalendarType,
  onCalendarTypeChange,
  isProcessing
}) => {
  const [inputMode, setInputMode] = usePersistentState<'calendar' | 'shift'>('calenjo-input-mode', 'calendar');
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [shiftFiles, setShiftFiles] = useState<File[]>([]);
  const [showCropScreen, setShowCropScreen] = useState(false);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [shiftText, setShiftText] = useState('');

  const handleFiles = useCallback((incomingFiles: File[]) => {
    const imageFiles = incomingFiles.filter((incomingFile) => incomingFile.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Please upload at least one image file');
      return;
    }

    if (inputMode === 'calendar') {
      const firstFile = imageFiles[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setOriginalPreview(result);
        setFile(firstFile);
        setShowCropScreen(true);
      };
      reader.readAsDataURL(firstFile);
      return;
    }

    setShiftFiles((previousFiles) => {
      const fileMap = new Map<string, File>();

      for (const existingFile of previousFiles) {
        fileMap.set(`${existingFile.name}-${existingFile.size}-${existingFile.lastModified}`, existingFile);
      }

      for (const incomingFile of imageFiles) {
        fileMap.set(`${incomingFile.name}-${incomingFile.size}-${incomingFile.lastModified}`, incomingFile);
      }

      return Array.from(fileMap.values());
    });
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

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
    e.target.value = '';
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

    if (inputMode === 'shift' && shiftFiles.length > 0) {
      onShiftScreenshotUpload(shiftFiles);
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
    setShiftFiles([]);
    setOriginalPreview(null);
    setShowCropScreen(false);
    setShiftText('');
    onClear();
  };

  const handleModeChange = (mode: 'calendar' | 'shift') => {
    setInputMode(mode);
    setPreview(null);
    setFile(null);
    setShiftFiles([]);
    setShowCropScreen(false);
    setOriginalPreview(null);
    if (mode === 'calendar') {
      setShiftText('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 card-hover">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Import Source</h2>
        </div>

        <div className="mb-6 p-1 bg-slate-100 rounded-xl inline-flex gap-1">
          <CalendarImage 
            isActive={inputMode === 'calendar'} 
            onClick={() => handleModeChange('calendar')} 
          />
          <ShiftMessages 
            isActive={inputMode === 'shift'} 
            onClick={() => handleModeChange('shift')} 
          />
        </div>

        {inputMode === 'calendar' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Detection Strategy</span>
              <select
                value={selectedStrategy}
                onChange={(e) => onStrategyChange(e.target.value as StrategyType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                disabled={isProcessing}
              >
                <option value="canvas">Canvas (fast)</option>
                <option value="opencv">OpenCV (robust)</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Calendar Parse Mode</span>
              <select
                value={selectedCalendarType}
                onChange={(e) => onCalendarTypeChange(e.target.value as CalendarType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                disabled={isProcessing}
              >
                <option value="jojo">Shift Mode (red dates)</option>
                <option value="standard">Standard Mode</option>
              </select>
            </label>
          </div>
        )}
        
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
            multiple={inputMode === 'shift'}
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
              <span className="text-slate-700"> or drag and drop</span>
            </div>
            <p className="text-sm text-slate-600">
              {inputMode === 'calendar'
                ? 'Upload a calendar screenshot (PNG, JPG, GIF)'
                : 'Upload one or more message screenshots from mobile or desktop'}
            </p>
          </div>
        </div>

        {inputMode === 'shift' && shiftFiles.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">
              {shiftFiles.length} screenshot{shiftFiles.length === 1 ? '' : 's'} selected
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Files are deduplicated by name, size, and modified time.
            </p>
          </div>
        )}

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
              className="w-full min-h-36 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              <ProcessCalendar 
                isProcessing={isProcessing} 
                onClick={handleProcess} 
              />
              <Clear 
                isProcessing={isProcessing} 
                onClick={handleClear} 
              />
            </div>
          </div>
        )}

        {inputMode === 'shift' && shiftText.trim().length > 0 && (
          <div className="mt-4">
            <ProcessPastedMessages 
              isProcessing={isProcessing} 
              onClick={handleProcessShiftText} 
            />
          </div>
        )}

        {inputMode === 'shift' && shiftFiles.length > 0 && (
          <div className="mt-4">
            <ProcessScreenshot 
              isProcessing={isProcessing}
              count={shiftFiles.length}
              onClick={handleProcess}
            />
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
