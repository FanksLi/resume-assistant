'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
};

interface ChatInterfaceProps {
  sessionId: string | null;
  messages: Message[];
  inputValue: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (inputValue?: string | undefined) => void;
}

const SUGGESTED_QUESTIONS = [
  "介绍一下你自己",
  "你有哪些优势",
  "如何优化我的工作经历描述",
  "简历中应该包含哪些关键技能",
  "如何让我的简历更突出"
];

export default function ChatInterface({
  sessionId,
  messages,
  inputValue,
  isLoading,
  onInputChange,
  onSendMessage
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到消息底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleSuggestedQuestionClick = (question: string) => {
    onInputChange(question);
    // 直接调用发送消息函数，确保状态更新后再执行
    onSendMessage(question)
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">AI助手对话</h2>
      
      {sessionId ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-96 lg:max-h-[calc(100vh-220px)]">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`p-4 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-50 border border-blue-100' 
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <div className="flex items-start">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 ${
                    message.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}>
                    <span className="text-white text-xs font-bold">
                      {message.role === 'user' ? '我' : 'AI'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-800 text-sm prose prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                  <div className="flex space-x-1 items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* 当没有消息时显示建议问题 */}
          {messages.length <= 1 && !isLoading && (
            <div className="mb-4">
              <p className="text-gray-500 text-sm mb-2">您可以尝试问：</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestionClick(question)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-full transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-auto pt-4 border-t border-gray-200">
            <div className="flex">
              <textarea
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="请输入您的问题..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                rows={3}
                disabled={isLoading}
              />
              <button
                onClick={() => onSendMessage()}
                disabled={isLoading || !inputValue.trim()}
                className={`ml-2 px-4 rounded-lg text-sm font-medium flex items-center ${
                  isLoading || !inputValue.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
          <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
          <p className="text-center text-base mb-2">请先上传简历文件以开始对话</p>
          <p className="text-center text-sm">上传简历后，您可以与AI助手进行智能对话</p>
        </div>
      )}
    </div>
  );
}