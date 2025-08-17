import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile, writeFile, unlink } from 'fs/promises';
import path from 'path';
import { readSessionsFromFile, writeSessionsToFile } from '../upload/route';

export async function DELETE(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { message: '会话ID不能为空' },
        { status: 400 }
      );
    }

    // 读取会话数据
    const sessions = await readSessionsFromFile();
    
    // 检查会话是否存在
    if (!sessions[sessionId]) {
      return NextResponse.json(
        { message: '会话不存在' },
        { status: 404 }
      );
    }

    // 删除会话数据
    delete sessions[sessionId];
    
    // 写入更新后的会话数据
    await writeSessionsToFile(sessions);
    
    // 删除向量化文件
    const vectorizationDir = path.join(process.cwd(), 'vectorization');
    const vectorFilename = `${sessionId}.json`;
    const vectorFilePath = path.join(vectorizationDir, vectorFilename);
    
    if (existsSync(vectorFilePath)) {
      try {
        await unlink(vectorFilePath);
      } catch (unlinkError) {
        console.error('删除向量化文件失败:', unlinkError);
      }
    }

    return NextResponse.json(
      { 
        message: '会话已清除',
        sessionId
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('会话清除错误:', error);
    return NextResponse.json(
      { message: `会话清除失败: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}