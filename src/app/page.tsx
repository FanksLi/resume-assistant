'use client';

import { useState, useEffect } from 'react';
import FileUploader from './components/FileUploader';
import FileList from './components/FileList';
import ChatInterface from './components/ChatInterface';
import FilePreview from './components/FilePreview';

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
};

type UploadedFile = {
  name: string;
  sessionId: string | null;
  hasVectorData: boolean;
  sessionExists: boolean;
  vectorFilename: string | null;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{name: string, content: string} | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const currentMessageRef = useState('');

  // 获取文件列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/files');
        const data = await response.json();
        if (response.ok) {
          setUploadedFiles(data.files);
          // 如果没有选中的文件，但有文件列表，默认选中第一个可用文件
          if (!selectedFilename && data.files.length > 0) {
            const firstAvailableFile = data.files.find((file: UploadedFile) => file.sessionExists);
            if (firstAvailableFile) {
              setSelectedFilename(firstAvailableFile.name);
              setSessionId(firstAvailableFile.sessionId);
              // 加载欢迎消息
              setMessages([{
                id: Date.now().toString(),
                content: `您好！我是您的AI简历助手。已切换到简历"${firstAvailableFile.name}"，您可以开始提问了。`,
                role: 'assistant'
              }]);
            }
          }
        }
      } catch (error) {
        console.error('获取文件列表失败:', error);
      }
    };

    fetchFiles();
  }, [sessionId]);

  // 刷新文件列表的函数
  const refreshFileList = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (response.ok) {
        setUploadedFiles(data.files);
      }
    } catch (error) {
      console.error('刷新文件列表失败:', error);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('请选择一个文件');
      return;
    }

    // 检查文件数量限制
    if (uploadedFiles.length >= 5) {
      alert('最多只能上传5个文件');
      return;
    }

    setIsUploading(true);
    setUploadStatus('正在上传文件...');
    setUploadProgress(0);

    // 模拟进度条增长
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // 确保进度条完成
      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();
      
      if (response.ok) {
        setUploadStatus('简历处理成功！');
        // 保留当前会话，支持连续添加文件
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            content: `新简历"${file.name}"已成功添加到您的文件列表中。`,
            role: 'assistant'
          }
        ]);
        // 清除当前选择的文件，允许用户选择新文件
        setFile(null);
        // 刷新文件列表
        refreshFileList();
      } else {
        setUploadStatus(`上传失败: ${result.message}`);
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadStatus(`上传出错: ${error.message || '未知错误'}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    }
  };

  const handleDeleteFile = async (filename: string) => {
    try {
      setIsLoading(true);
      setUploadStatus(`正在删除文件: ${filename}...`);

      const response = await fetch('/api/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus(`文件"${filename}"已成功删除`);
        
        // 如果删除的是当前选中的文件，清除会话
        if (selectedFilename === filename) {
          setSessionId(null);
          setSelectedFilename(null);
          setMessages([]);
        }
        
        // 刷新文件列表
        refreshFileList();
      } else {
        setUploadStatus(`删除失败: ${result.message}`);
      }
    } catch (error: any) {
      setUploadStatus(`删除文件出错: ${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchFile = async (filename: string) => {
    try {
      setIsLoading(true);
      setUploadStatus(`正在切换到文件: ${filename}...`);

      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      const result = await response.json();

      if (response.ok && !result.requiresReprocessing) {
        setSessionId(result.sessionId);
        setSelectedFilename(filename);
        setUploadStatus(`已切换到文件: ${filename}`);
        
        // 加载欢迎消息
        setMessages([{
          id: Date.now().toString(),
          content: `您好！我是您的AI简历助手。已切换到简历"${filename}"，您可以开始提问了。`,
          role: 'assistant'
        }]);
      } else if (result.requiresReprocessing) {
        setUploadStatus(`文件"${filename}"需要重新处理，请重新上传。`);
      } else {
        setUploadStatus(`切换失败: ${result.message}`);
      }
    } catch (error: any) {
      setUploadStatus(`切换文件出错: ${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewFile = async (filename: string) => {
    setIsPreviewLoading(true);
    setIsPreviewOpen(true);
    setPreviewData(null);
    
    try {
      // 从上传目录获取文件内容
      const response = await fetch(`/api/files?preview=${encodeURIComponent(filename)}`);
      const result = await response.json();
      
      if (response.ok) {
        setPreviewData({
          name: filename,
          content: result.content
        });
      } else {
        console.error('预览文件失败:', result.message);
      }
    } catch (error) {
      console.error('预览文件出错:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewData(null);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionId || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    // currentMessageRef.current = '';

    try {
      // 使用SSE流式处理
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: inputValue,
          sessionId,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // 添加初始助手消息
      const assistantMessageId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        content: '',
        role: 'assistant'
      }]);

      let accumulatedContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6); // 移除 'data: ' 前缀
          
          if (data === '[DONE]') {
            // 流结束
            continue;
          }
          
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.content) {
              accumulatedContent += parsed.content;
              // 更新助手消息
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: accumulatedContent } 
                  : msg
              ));
            }
          } catch (e) {
            console.error('解析SSE数据失败:', e);
          }
        }
      }
    } catch (error: any) {
      // 添加错误消息
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `网络错误: ${error.message || '未知错误'}`,
        role: 'assistant'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // currentMessageRef.current = '';
    }
  };

  const handleClearSession = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/session', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      if (response.ok) {
        setSessionId(null);
        setMessages([]);
        setFile(null);
        setUploadStatus('');
        setSelectedFilename(null);
      } else {
        alert(`清除会话失败: ${result.message}`);
      }
    } catch (error: any) {
      alert(`清除会话出错: ${error.message || '未知错误'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-8 h-8 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-900">AI简历助手</h1>
            </div>
            <div className="text-sm text-gray-500 hidden sm:block">
              基于AI的智能简历分析工具
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
          {/* 左侧：上传区域和文件列表 */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
              <FileUploader
                file={file}
                sessionId={sessionId}
                isLoading={isLoading}
                isUploading={isUploading}
                uploadStatus={uploadStatus}
                uploadProgress={uploadProgress}
                uploadedFiles={uploadedFiles}
                onFileChange={setFile}
                onUpload={handleUpload}
                onClearSession={handleClearSession}
              />
              
              <FileList
                uploadedFiles={uploadedFiles}
                selectedFilename={selectedFilename}
                onSwitchFile={handleSwitchFile}
                onPreviewFile={handlePreviewFile}
                onDeleteFile={handleDeleteFile}
              />
            </div>
          </div>

          {/* 右侧：聊天区域 */}
          <div className="lg:w-2/3">
            <ChatInterface
              sessionId={sessionId}
              messages={messages}
              inputValue={inputValue}
              isLoading={isLoading}
              onInputChange={setInputValue}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </main>

      <FilePreview
        filename={previewData?.name || null}
        content={previewData?.content || null}
        isLoading={isPreviewLoading}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      />

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} AI简历助手 - 基于Next.js和Langchain构建
        </div>
      </footer>
    </div>
  );
}