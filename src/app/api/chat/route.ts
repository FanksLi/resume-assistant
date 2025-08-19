import { NextResponse } from 'next/server';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { searchSimilarDocuments } from '@/app/lib/vectorStore';
import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { createVectorStore } from '@/app/lib/vectorStore';
import { readSessionsFromFile } from '@/app/lib/sessionManager';

export async function POST(request: Request) {
  try {
    const { message, sessionId, stream = false } = await request.json();

    // 检查消息参数（修复参数名称）
    if (!message) {
      return NextResponse.json(
        { message: '消息不能为空' },
        { status: 400 }
      );
    }

    // 检查会话ID参数
    if (!sessionId) {
      return NextResponse.json(
        { message: '会话ID不能为空' },
        { status: 400 }
      );
    }

    // 检查会话是否存在
    let sessionData = null;

    // 仅在非生产环境中从本地文件中读取会话数据
    const sessions = await readSessionsFromFile();
    const sessionInfo = sessions[sessionId];

    if (sessionInfo) {
      // 如果会话存在，尝试从向量化文件中恢复向量存储
      const vectorizationDir = path.join(process.cwd(), 'vectorization');
      if (existsSync(vectorizationDir)) {
        try {
          // 查找对应的向量化文件
          const vectorFilename = `${sessionId}.json`;
          const vectorFilePath = path.join(vectorizationDir, vectorFilename);

          if (existsSync(vectorFilePath)) {
            // 读取向量化数据
            const fileContent = await readFile(vectorFilePath, 'utf8');
            const vectorData = JSON.parse(fileContent);

            // 重新创建向量存储
            const vectorStore = await createVectorStore(vectorData.chunks);

            // 重建会话数据
            sessionData = {
              vectorStore,
              filename: vectorData.filename,
              createdAt: new Date(vectorData.createdAt)
            };
          }
        } catch (recoverError) {
          console.error('会话恢复失败:', recoverError);
        }
      }
    }

    // 再次检查会话是否存在
    if (!sessionData) {
      return NextResponse.json(
        { message: '会话不存在或已过期' },
        { status: 404 }
      );
    }

    const { vectorStore } = sessionData;

    // 搜索相关文档
    const relatedDocs = await searchSimilarDocuments(vectorStore, message, 4);

    // 构建上下文
    const context = relatedDocs.map(doc => doc.pageContent).join('\n\n');

    // 检查是否配置了DeepSeek API密钥
    const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepSeekApiKey) {
      // 如果没有配置API密钥，则返回基于检索内容的简单回答
      return NextResponse.json(
        {
          reply: `根据您的简历内容，我找到了以下相关信息：\n\n${context}\n\n请注意：由于系统未配置AI模型API密钥，我无法生成智能回答。请配置DEEPSEEK_API_KEY环境变量以启用完整功能。`,
          sources: relatedDocs.map(doc => ({
            content: doc.pageContent,
            metadata: doc.metadata
          }))
        },
        { status: 200 }
      );
    }

    // 创建提示模板
    const promptTemplate = PromptTemplate.fromTemplate(
      `你是一个智能简历助手，你的任务是根据提供的简历内容回答用户的问题。
      
      简历内容:
      {context}
      
      用户问题:
      {question}
      
      请根据简历内容回答问题。如果简历中没有相关信息，请说明无法根据提供的简历内容回答该问题。
      回答应该简洁明了，直接针对用户的问题。`
    );

    // 初始化语言模型(DeepSeek)
    const model = new ChatOpenAI({
      modelName: "deepseek-chat",
      apiKey: deepSeekApiKey,
      configuration: {
        baseURL: "https://api.deepseek.com/v1",
      },
      temperature: 0.7,
      streaming: stream, // 启用流式输出
    });

    // 创建处理链
    const chain = RunnableSequence.from([
      {
        context: () => context,
        question: (input: { question: string }) => input.question,
      },
      promptTemplate,
      model,
      new StringOutputParser(),
    ]);

    if (stream) {
      // 流式响应
      const streamResponse = await chain.stream({ question: message });

      // 创建ReadableStream
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // 生成回答
      const reply = await chain.invoke({ question: message });

      return NextResponse.json(
        {
          reply,
          sources: relatedDocs.map(doc => ({
            content: doc.pageContent,
            metadata: doc.metadata
          }))
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('聊天处理错误:', error);
    return NextResponse.json(
      { message: `聊天处理失败: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}