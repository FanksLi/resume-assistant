'use client';

import { useState, useRef } from 'react';

interface FileUploaderProps {
  file: File | null;
  sessionId: string | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadStatus: string;
  uploadProgress: number;
  uploadedFiles: {
    name: string;
    sessionId: string | null;
    hasVectorData: boolean;
    sessionExists: boolean;
    vectorFilename: string | null;
  }[];
  onFileChange: (file: File) => void;
  onUpload: () => void;
  onClearSession: () => void;
}

export default function FileUploader({
  file,
  sessionId,
  isLoading,
  isUploading,
  uploadStatus,
  uploadProgress,
  uploadedFiles,
  onFileChange,
  onUpload,
  onClearSession
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">上传简历</h2>
      
      <div className="mb-2 text-sm text-gray-500">
        已上传 {uploadedFiles.length}/5 个文件
      </div>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors mb-6 ${
          uploadedFiles.length >= 5 ? 'border-gray-400 bg-gray-100 cursor-not-allowed' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (uploadedFiles.length < 5) {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => e.target.files && onFileChange(e.target.files[0])}
          accept=".pdf,.docx,.txt"
          disabled={isUploading || uploadedFiles.length >= 5}
        />
        
        {file ? (
          <div className="flex flex-col items-center">
            <svg className="w-10 h-10 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-base font-medium text-gray-700 break-all">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
        ) : (
          <div>
            <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="text-base font-medium text-gray-700 mb-1">
              {uploadedFiles.length >= 5 ? '已达到最大文件数量限制' : '拖拽文件到此处或点击选择文件'}
            </p>
            <p className="text-gray-500 text-sm">
              {uploadedFiles.length >= 5 ? '' : '支持 PDF, DOCX, TXT 格式'}
            </p>
          </div>
        )}
      </div>

      {!sessionId ? (
        <>
          {file && (
            <div className="mt-6">
              <button
                onClick={onUpload}
                disabled={isUploading}
                className={`w-full px-4 py-2 rounded-lg text-white font-medium text-sm ${
                  isUploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                {isUploading ? '上传中...' : '添加更多简历'}
              </button>
            </div>
          )}

          {isUploading && uploadProgress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>上传进度</span>
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

          {uploadStatus && (
            <div className="mt-4 text-center">
              <p className={`text-sm ${uploadStatus.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
                {uploadStatus}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-green-700 font-medium">简历已就绪</span>
            </div>
            <p className="text-green-600 text-sm mt-1">您可以开始与AI助手对话了</p>
          </div>
          
          {/* 添加上传按钮，允许用户在已有会话中继续添加文件 */}
          {file && (
            <div className="mt-4">
              <button
                onClick={onUpload}
                disabled={isUploading}
                className={`w-full px-4 py-2 rounded-lg text-white font-medium text-sm ${
                  isUploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                {isUploading ? '上传中...' : '添加更多简历'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}