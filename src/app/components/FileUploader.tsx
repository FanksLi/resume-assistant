'use client';

import { useState, useRef } from 'react';

interface FileUploaderProps {
  file: File | null;
  isUploading: boolean;
  uploadStatus: string;
  uploadProgress: number;
  onFileChange: (file: File) => void;
  onUpload: (file: File) => void;
  onUploadError?: (message: string) => void;
}

export default function FileUploader({
  file,
  isUploading,
  uploadStatus,
  uploadProgress,
  onFileChange,
  onUpload,
  onUploadError,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 5 * 1024 * 1024;

  const handleSelect = (selected: File) => {
    if (isUploading) return;
    if (selected.size > MAX_SIZE) {
      onFileChange(selected);
      onUploadError?.("文件过大，请上传不超过 5MB 的文件");
      return;
    }
    onFileChange(selected);
    onUpload(selected);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-xl">
      <div
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 transition-colors mb-6 ${
          isUploading
            ? 'border-gray-400 bg-gray-100 cursor-not-allowed'
            : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (!isUploading) fileInputRef.current?.click();
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => e.target.files && handleSelect(e.target.files[0])}
          accept=".pdf,.docx,.txt"
          disabled={isUploading}
        />

        {file ? (
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-lg font-medium text-gray-700 break-all">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
        ) : (
          <div>
            <svg className="w-14 h-14 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-1">
              拖拽文件到此处或点击选择文件
            </p>
            <p className="text-gray-500 text-sm">
              支持 PDF, DOCX, TXT 格式（单个文件，最大 5MB）
            </p>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="mt-5">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>正在上传并解析简历...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {uploadStatus && !isUploading && (
        <div className="mt-4 text-center">
          <p className={`text-sm ${uploadStatus.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
            {uploadStatus}
          </p>
        </div>
      )}
    </div>
  );
}
