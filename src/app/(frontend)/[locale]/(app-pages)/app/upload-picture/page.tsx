'use client';

import { uploadUserImage } from '@/features/payload-cms/components/user-upload/upload-user-image';
import type React from 'react';
import { useState } from 'react';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  return Number.parseFloat((bytes / Math.pow(k, index)).toFixed(2)) + ' ' + sizes[index];
};

const ImageUploadPage: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [userDescription, setUserDescription] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [rightsTransferred, setRightsTransferred] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;
    if (files) {
      const newFiles = [...files].filter((file) => file.type.startsWith('image/'));
      setSelectedFiles((previous) => [...previous, ...newFiles]);
    }
  };

  const removeFile = (index: number): void => {
    setSelectedFiles((previous) => previous.filter((_, index_) => index_ !== index));
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      alert('Please select at least one image');
      return;
    }

    if (!userDescription) {
      alert('Please write a short description of the image');
      return;
    }

    if (!privacyAccepted || !rightsTransferred) {
      alert('Please accept both confirmations to proceed');
      return;
    }

    const response = await uploadUserImage(selectedFiles, userDescription);
    if (response.error) {
      alert('Error! ' + response.message);
    }
    alert(response.message);
    // TODO: clear form
  };

  return (
    <div className="container mx-auto mt-8 max-w-2xl px-4">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Image Upload
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload your images and confirm the required agreements
        </p>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <label className="block text-base font-medium text-gray-700">Select Images</label>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-gray-400">
              <input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="images" className="flex cursor-pointer flex-col items-center gap-2">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm text-gray-600">
                  Click to select images or drag and drop
                </span>
                <span className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</span>
              </label>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Selected Images ({selectedFiles.length})
                </label>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded border bg-gray-50 p-2"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="truncate text-sm">{file.name}</span>
                        <span className="flex-shrink-0 text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Separator */}
          <hr className="border-gray-200" />

          {/* Description Section */}
          <div className="space-y-4">
            <label className="block text-base font-medium text-gray-700">Image Description</label>

            {/* Description Field */}
            <input
              id="description"
              type="textarea"
              onChange={(event) => setUserDescription(event.target.value)}
              className="h-12 rounded-lg border-2 border-dashed border-gray-300 text-center transition-colors hover:border-gray-400"
            />
          </div>

          {/* Separator */}
          <hr className="border-gray-200" />

          {/* Confirmations Section */}
          <div className="space-y-4">
            <label className="block text-base font-medium text-gray-700">
              Required Confirmations
            </label>

            {/* Data Privacy Confirmation */}
            <div className="flex items-start space-x-3">
              <div className="flex h-5 items-center">
                <input
                  id="privacy"
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="privacy" className="cursor-pointer font-medium text-gray-700">
                  Data Privacy Agreement
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  I acknowledge that my uploaded images will be processed and stored securely. I
                  understand that my data will be handled in accordance with applicable privacy laws
                  and will not be shared with third parties without my explicit consent.
                </p>
              </div>
            </div>

            {/* Rights Transfer Confirmation */}
            <div className="flex items-start space-x-3">
              <div className="flex h-5 items-center">
                <input
                  id="rights"
                  type="checkbox"
                  checked={rightsTransferred}
                  onChange={(event) => setRightsTransferred(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="rights" className="cursor-pointer font-medium text-gray-700">
                  Rights Transfer to conveniat27 Team
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  I hereby transfer all rights, title, and interest in the uploaded images to the
                  Conveniat27 team. I confirm that I am the rightful owner of these images and have
                  the authority to transfer these rights. The Conveniat27 team may use, modify,
                  distribute, and display these images for any purpose.
                </p>
              </div>
            </div>
          </div>

          {/* Separator */}
          <hr className="border-gray-200" />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={selectedFiles.length === 0 || !privacyAccepted || !rightsTransferred}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              selectedFiles.length === 0 || !privacyAccepted || !rightsTransferred
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
            }`}
          >
            Upload Images ({selectedFiles.length})
          </button>
        </form>
      </div>
    </div>
  );
};

export default ImageUploadPage;
