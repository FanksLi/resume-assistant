"use client";

import { useState, useEffect, useRef } from "react";
import FileUploader from "./components/FileUploader";
import FileList from "./components/FileList";
import ChatInterface from "./components/ChatInterface";
import FilePreview from "./components/FilePreview";

// 检查是否为生产环境
const isProduction = process.env.NODE_ENV === "production";

type Message = {
  id: string;
  content: string;
  role: "user" | "assistant";
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
  const [uploadStatus, setUploadStatus] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const currentMessageRef = useRef("");

  // 获取文件列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch("/api/files");
        const data = await response.json();
        if (response.ok) {
          setUploadedFiles(data.files);
          // 如果没有选中的文件，但有文件列表，默认选中第一个可用文件
          if (!selectedFilename && data.files.length > 0) {
            const firstAvailableFile = data.files.find(
              (file: UploadedFile) => file.sessionExists
            );
            if (firstAvailableFile) {
              setSelectedFilename(firstAvailableFile.name);
              setSessionId(firstAvailableFile.sessionId);
              // 加载欢迎消息
              setMessages([
                {
                  id: Date.now().toString(),
                  content: `您好！我是您的AI简历助手。已切换到简历"${firstAvailableFile.name}"，您可以开始提问了。`,
                  role: "assistant",
                },
              ]);
            }
          }
        }
      } catch (error) {
        console.error("获取文件列表失败:", error);
      }
    };

    fetchFiles();
  }, [sessionId]);

  // 刷新文件列表的函数
  const refreshFileList = async () => {
    try {
      const response = await fetch("/api/files");
      const data = await response.json();
      if (response.ok) {
        setUploadedFiles(data.files);
      }
    } catch (error) {
      console.error("刷新文件列表失败:", error);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("请选择一个文件");
      return;
    }

    // 检查文件数量限制
    if (uploadedFiles.length >= 5) {
      alert("最多只能上传5个文件");
      return;
    }

    setIsUploading(true);
    setUploadStatus("正在上传文件...");
    setUploadProgress(0);

    // 模拟进度条增长
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        setUploadStatus(data.message);
        setSessionId(data.sessionId);
        setTimeout(() => {
          setFile(null);
          setUploadStatus("");
          setUploadProgress(0);
          refreshFileList();
        }, 2000);
      } else {
        setUploadStatus(data.message || "上传失败");
        setIsUploading(false);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus("上传过程中发生错误");
      console.error("上传错误:", error);
      setIsUploading(false);
    }
  };

  // 处理文件更新
  const handleUpdateFile = async (originalFilename: string, newFile: File) => {
    setIsUploading(true);
    setUploadStatus("正在更新文件...");
    setUploadProgress(0);

    // 模拟进度条增长
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", newFile);
      formData.append("originalFilename", originalFilename);

      const response = await fetch("/api/files", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        setUploadStatus(data.message);
        // 更新当前会话ID（如果更新的是当前选中的文件）
        if (selectedFilename === originalFilename) {
          setSessionId(data.sessionId);
          // 刷新消息，显示新文件已更新
          setMessages([
            {
              id: Date.now().toString(),
              content: `简历"${originalFilename}"已更新成功！您现在可以基于更新后的简历内容进行提问了。`,
              role: "assistant",
            },
          ]);
        }
        setTimeout(() => {
          setUploadStatus("");
          setUploadProgress(0);
          refreshFileList();
        }, 2000);
      } else {
        setUploadStatus(data.message || "更新失败");
        setIsUploading(false);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus("更新过程中发生错误");
      console.error("更新错误:", error);
      setIsUploading(false);
    }
  };

  const handleSwitchFile = async (filename: string) => {
    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresReprocessing) {
          setUploadStatus(`文件"${filename}"需要重新处理`);
          setSelectedFilename(filename);
          setSessionId(null);
          setMessages([]);
        } else {
          setSelectedFilename(filename);
          setSessionId(data.sessionId);
          setUploadStatus("");

          // 更新消息，显示已切换到新文件
          setMessages([
            {
              id: Date.now().toString(),
              content: `您好！我是您的AI简历助手。已切换到简历"${filename}"，您可以开始提问了。`,
              role: "assistant",
            },
          ]);
        }
      } else {
        alert(data.message || "切换文件失败");
      }
    } catch (error) {
      console.error("切换文件错误:", error);
      alert("切换文件时发生错误");
    }
  };

  const handleDeleteFile = async (filename: string) => {
    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();

      if (response.ok) {
        // 如果删除的是当前选中的文件，清除会话
        if (selectedFilename === filename) {
          setSelectedFilename(null);
          setSessionId(null);
          setMessages([]);
        }

        refreshFileList();
        alert(data.message);
      } else {
        alert(data.message || "删除文件失败");
      }
    } catch (error) {
      console.error("删除文件错误:", error);
      alert("删除文件时发生错误");
    }
  };

  const handlePreviewFile = async (filename: string) => {
    setIsPreviewLoading(true);
    setIsPreviewOpen(true);
    setPreviewData(null);

    try {
      const response = await fetch(
        `/api/files?preview=${encodeURIComponent(filename)}`
      );
      const data = await response.json();

      if (response.ok) {
        setPreviewData({
          name: filename,
          content: data.content,
        });
      } else {
        alert(data.message || "预览文件失败");
        setIsPreviewOpen(false);
      }
    } catch (error) {
      console.error("预览文件错误:", error);
      alert("预览文件时发生错误");
      setIsPreviewOpen(false);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClearSession = () => {
    setSessionId(null);
    setSelectedFilename(null);
    setMessages([]);
  };

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleSendMessage = async (question?: string) => {
    const value = question || inputValue;
    if (!value.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: value,
      role: "user",
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);
    currentMessageRef.current = "";

    try {
      // 创建一个新的助手消息用于流式更新
      const assistantMessageId = (Date.now() + 1).toString();

      // 发起流式请求
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          sessionId: sessionId,
          stream: true, // 启用流式传输
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("响应体为空");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      // 创建初始的助手消息
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: "",
        role: "assistant",
      };

      setMessages([...newMessages, assistantMessage]);

      // 逐步读取流式响应
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              // 流完成，退出循环
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                currentMessageRef.current += parsed.content;

                // 更新消息列表中的助手消息
                setMessages((prevMessages) => {
                  const updatedMessages = [...prevMessages];
                  const lastMessage =
                    updatedMessages[updatedMessages.length - 1];

                  if (lastMessage.id === assistantMessageId) {
                    lastMessage.content = currentMessageRef.current;
                  }

                  return updatedMessages;
                });
              }
            } catch (parseError) {
              console.error("解析流数据错误:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("发送消息错误:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "抱歉，我无法处理您的请求。请稍后重试。",
        role: "assistant",
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            AI简历助手
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            智能简历优化工具，助您打造专业简历
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧文件上传和文件列表区域 */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
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
              onUpdateFile={handleUpdateFile}
              isProduction={isProduction}
            />
          </div>

          {/* 右侧聊天区域 */}
          <div className={`${"lg:col-span-2"} flex flex-col`}>
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

        <FilePreview
          isOpen={isPreviewOpen}
          isLoading={isPreviewLoading}
          filename={previewData?.name || null}
          content={previewData?.content || null}
          onClose={() => setIsPreviewOpen(false)}
        />
      </div>
    </div>
  );
}
