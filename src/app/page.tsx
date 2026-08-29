"use client";

import { useState, useRef } from "react";
import FileUploader from "./components/FileUploader";
import ChatInterface from "./components/ChatInterface";

type Message = {
  id: string;
  content: string;
  role: "user" | "assistant";
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
  const currentMessageRef = useRef("");

  const handleUploadError = (message: string) => {
    setUploadStatus(message);
    setIsUploading(false);
  };

  const handleUpload = async (selectedFile: File) => {
    if (isUploading) return;

    setFile(selectedFile);

    setIsUploading(true);
    setUploadStatus("");
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 10));
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        setSessionId(data.sessionId);
        setMessages([
          {
            id: Date.now().toString(),
            content:
              "您好！我是您的AI简历助手。简历已上传成功，您可以开始提问了。",
            role: "assistant",
          },
        ]);
        setFile(null);
        setUploadStatus("");
        setUploadProgress(0);
        setIsUploading(false);
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

  // 替换简历：保留当前会话用的清晰占位，重新走上传流程
  const handleReset = () => {
    setSessionId(null);
    setMessages([]);
    setFile(null);
    setUploadStatus("");
    setUploadProgress(0);
    setIsUploading(false);
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
      const assistantMessageId = (Date.now() + 1).toString();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          sessionId: sessionId,
          stream: true,
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

      const assistantMessage: Message = {
        id: assistantMessageId,
        content: "",
        role: "assistant",
      };

      setMessages([...newMessages, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                currentMessageRef.current += parsed.content;

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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <div className="text-center mb-8 shrink-0">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            AI简历助手
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            智能简历优化工具，助您打造专业简历
          </p>
        </div>

        {!sessionId ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-0">
            <FileUploader
              file={file}
              isUploading={isUploading}
              uploadStatus={uploadStatus}
              uploadProgress={uploadProgress}
              onFileChange={setFile}
              onUpload={handleUpload}
              onUploadError={handleUploadError}
            />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex justify-end mb-4 shrink-0">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg text-gray-700 font-medium text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                重新上传简历
              </button>
            </div>
            <ChatInterface
              sessionId={sessionId}
              messages={messages}
              inputValue={inputValue}
              isLoading={isLoading}
              onInputChange={setInputValue}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
