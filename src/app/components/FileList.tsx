'use client';

import { useState } from 'react';

type UploadedFile = {
  name: string;
  sessionId: string | null;
  hasVectorData: boolean;
  sessionExists: boolean;
  vectorFilename: string | null;
};

interface FileListProps {
  uploadedFiles: UploadedFile[];
  selectedFilename: string | null;
  onSwitchFile: (filename: string) => void;
  onPreviewFile: (filename: string) => void;
  onDeleteFile: (filename: string) => void;
}

export default function FileList({
  uploadedFiles,
  selectedFilename,
  onSwitchFile,
  onPreviewFile,
  onDeleteFile
}: FileListProps) {
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const confirmDelete = (filename: string) => {
    setFileToDelete(filename);
  };

  const handleDelete = () => {
    if (fileToDelete) {
      onDeleteFile(fileToDelete);
      setFileToDelete(null);
    }
  };

  return (
    <>
      <div className="mt-6 pt-6 border-t border-gray-200 flex-1">
        <h3 className="text-base font-medium text-gray-900 mb-3">已上传的文件</h3>
        {uploadedFiles.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {uploadedFiles.map((uploadedFile, index) => (
              <div 
                key={`${uploadedFile.name}-${index}`} // 使用文件名和索引组合作为唯一key
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFilename === uploadedFile.name
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
                onClick={() => onSwitchFile(uploadedFile.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.name}
                    </p>
                    <div className="flex items-center mt-1">
                      {uploadedFile.sessionExists ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <svg className="mr-1 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          可用
                        </span>
                      ) : uploadedFile.hasVectorData ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <svg className="mr-1 h-2 w-2 text-yellow-400" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          需要重新处理
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          <svg className="mr-1 h-2 w-2 text-red-400" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          未处理
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewFile(uploadedFile.name);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                      title="预览文件"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                    {uploadedFile.sessionExists && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSwitchFile(uploadedFile.name);
                        }}
                        className={`${
                          selectedFilename === uploadedFile.name 
                            ? 'text-blue-500' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="切换到此文件"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(uploadedFile.name);
                      }}
                      className="text-gray-500 hover:text-red-500"
                      title="删除文件"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">暂无已上传的文件</p>
        )}

        <div className="mt-6">
          <h3 className="text-base font-medium text-gray-900 mb-3">使用说明</h3>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex items-start">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
              <span>上传您的简历文件（支持PDF、DOCX、TXT格式）</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
              <span>点击已上传文件可快速切换和查看</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
              <span>绿色标记文件可直接使用，无需重复处理</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-medium text-gray-900 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-4">
              确定要删除文件 <span className="font-medium">{fileToDelete}</span> 吗？此操作不可撤销。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}