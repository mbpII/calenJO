'use client';

import React, { useRef, useState, useCallback } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

interface CropScreenProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export const CropScreen: React.FC<CropScreenProps> = ({
  imageSrc,
  onCropComplete,
  onSkip,
  onCancel
}) => {
  const cropperRef = useRef<HTMLImageElement & { cropper: Cropper }>(null);
  const [isCropping, setIsCropping] = useState(false);

  const handleCrop = useCallback(async () => {
    if (!cropperRef.current?.cropper) return;
    
    setIsCropping(true);
    
    try {
      // Get the cropped canvas
      const canvas = cropperRef.current.cropper.getCroppedCanvas({
        maxWidth: 4096,
        maxHeight: 4096,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
      
      // Convert to data URL - use PNG to preserve quality and colors
      const croppedImage = canvas.toDataURL('image/png');
      onCropComplete(croppedImage);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsCropping(false);
    }
  }, [onCropComplete]);

  const handleRotate = (degrees: number) => {
    if (cropperRef.current?.cropper) {
      cropperRef.current.cropper.rotate(degrees);
    }
  };

  const handleZoom = (ratio: number) => {
    if (cropperRef.current?.cropper) {
      cropperRef.current.cropper.zoom(ratio);
    }
  };

  const handleReset = () => {
    if (cropperRef.current?.cropper) {
      cropperRef.current.cropper.reset();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Crop Your Calendar</h2>
            <p className="text-sm text-gray-400 mt-1">
              Please crop to show only the dates you want to extract
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSkip}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Already Cropped
            </button>
            <button
              onClick={handleCrop}
              disabled={isCropping}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isCropping ? 'Processing...' : 'Confirm Crop'}
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border-b border-yellow-200 p-3">
        <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-yellow-800">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>Important:</strong> Crop to show only ONE month to avoid data mixing. 
            Include the date numbers clearly visible. You can drag to move, scroll to zoom, and use the controls below.
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-100 p-3 border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-4">
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300"
            title="Zoom out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <button
            onClick={() => handleZoom(0.1)}
            className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300"
            title="Zoom in"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </button>
          <div className="w-px h-8 bg-gray-300 mx-2" />
          <button
            onClick={() => handleRotate(-90)}
            className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300"
            title="Rotate left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={() => handleRotate(90)}
            className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300"
            title="Rotate right"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <div className="w-px h-8 bg-gray-300 mx-2" />
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300 text-sm font-medium"
          >
            Reset
          </button>
          <button
            onClick={() => cropperRef.current?.cropper?.setAspectRatio(16 / 9)}
            className="px-4 py-2 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300 text-sm font-medium"
          >
            16:9
          </button>
          <button
            onClick={() => cropperRef.current?.cropper?.setAspectRatio(4 / 3)}
            className="px-4 py-2 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300 text-sm font-medium"
          >
            4:3
          </button>
          <button
            onClick={() => cropperRef.current?.cropper?.setAspectRatio(NaN)}
            className="px-4 py-2 bg-white rounded-md shadow-sm hover:bg-gray-50 border border-gray-300 text-sm font-medium"
          >
            Free
          </button>
        </div>
      </div>

      {/* Cropper */}
      <div className="flex-1 bg-gray-800 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto p-4">
          <Cropper
            ref={cropperRef}
            src={imageSrc}
            style={{ height: '100%', width: '100%' }}
            aspectRatio={NaN}
            guides={true}
            viewMode={1} // Restrict crop box to canvas
            dragMode="move"
            autoCropArea={0.8}
            background={false}
            modal={true}
            highlight={true}
            cropBoxMovable={true}
            cropBoxResizable={true}
            toggleDragModeOnDblclick={true}
            minContainerWidth={200}
            minContainerHeight={200}
          />
        </div>
      </div>
    </div>
  );
};
