import { NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { parseDocument } from '@/app/lib/documentProcessor';
import { splitText } from '@/app/lib/textSplitter';
import { readSessionsFromFile, writeSessionsToFile } from '@/app/lib/sessionManager';

export async function POST(request: Request) {
  try {
    // 在 Vercel 环境中，我们不将文件保存到磁盘，而是直接处理文件内容
    // 仅在非生产环境中创建 uploads 目录用于本地开发
    if (process.env.NODE_ENV !== 'production') {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
    }

    // 确保vectorization目录存在，仅在非生产环境中创建
    const vectorizationDir = path.join(process.cwd(), 'vectorization');
    if (process.env.NODE_ENV !== 'production' && !existsSync(vectorizationDir)) {
      await mkdir(vectorizationDir, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { message: '没有找到文件' },
        { status: 400 }
      );
    }

    // 检查文件类型
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: '不支持的文件类型，仅支持PDF、DOCX和TXT格式' },
        { status: 400 }
      );
    }

    // 检查文件大小 (限制为10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { message: '文件大小超过限制（10MB）' },
        { status: 400 }
      );
    }

    // 直接处理文件内容，不保存到磁盘
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 为本地开发环境保存文件
    let filepath = '';
    if (process.env.NODE_ENV !== 'production') {
      const filename = `${Date.now()}-${file.name}`;
      filepath = path.join(process.cwd(), 'uploads', filename);
      await writeFile(filepath, buffer);
    }

    // 解析文档内容
    let text = '';
    if (process.env.NODE_ENV === 'production') {
      // 在生产环境中直接处理 buffer
      text = await parseDocument(buffer, file.type);
    } else {
      // 在开发环境中处理文件路径
      text = await parseDocument(filepath, file.type);
    }
    
    // 文本分片
    const texts = await splitText(text, 1000, 200);
    
    // // 创建向量存储（现在使用千问的text-embedding-v4模型）
    // const vectorStore = await createVectorStore(texts);

    // 生成会话ID并存储向量存储
    const sessionId = `session-${Date.now()}`;
    
    // 读取现有会话数据
    const sessions = await readSessionsFromFile();
    
    // 更新会话数据
    sessions[sessionId] = {
      filename: file.name,
      createdAt: new Date().toISOString()
    };
    
    // 写入会话数据到文件
    await writeSessionsToFile(sessions);

    // 将向量化数据存储到vectorization目录，仅在非生产环境中执行
    if (process.env.NODE_ENV !== 'production') {
      const vectorData = {
        sessionId,
        filename: file.name,
        originalText: text, // 保存解析后的纯文本，而不是原始二进制内容
        chunks: texts,
        createdAt: new Date().toISOString()
      };
      
      // 使用格式: {sessionId}.json 以便于会话恢复
      const vectorFilename = `${sessionId}.json`;
      const vectorFilePath = path.join(vectorizationDir, vectorFilename);
      await writeFile(vectorFilePath, JSON.stringify(vectorData, null, 2));
    }

    return NextResponse.json(
      { 
        message: '简历处理成功',
        sessionId: sessionId,
        chunks: texts.length
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('简历处理错误:', error);
    return NextResponse.json(
      { message: '简历处理失败', error: error.message || '未知错误' },
      { status: 500 }
    );
  }
}