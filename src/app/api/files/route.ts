import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile, readdir, unlink, stat } from 'fs/promises';
import path from 'path';
import { readSessionsFromFile, writeSessionsToFile } from '../upload/route';
import { parseDocument } from '@/app/lib/documentProcessor';

// 定义会话数据类型
interface SessionData {
  filename: string;
  originalName: string;
  createdAt: string;
}

// 定义向量化文件数据类型
interface VectorData {
  filename: string;
  sessionId: string;
}

// 获取已上传的文件列表
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const previewFile = searchParams.get('preview');

  // 如果是预览请求
  if (previewFile) {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      
      // 查找匹配的文件（文件名可能包含时间戳前缀）
      const uploadedFiles = await readdir(uploadDir);
      let targetFilePath = null;
      let targetFileMime = 'text/plain'; // 默认MIME类型
      
      for (const filename of uploadedFiles) {
        // 文件名格式: {timestamp}-{originalFilename}
        const originalFilename = filename.replace(/^\d+-/, '');
        if (originalFilename === previewFile) {
          targetFilePath = path.join(uploadDir, filename);
          
          // 确定文件MIME类型
          if (originalFilename.endsWith('.pdf')) {
            targetFileMime = 'application/pdf';
          } else if (originalFilename.endsWith('.docx')) {
            targetFileMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          } else {
            targetFileMime = 'text/plain';
          }
          break;
        }
      }
      
      if (!targetFilePath) {
        return NextResponse.json(
          { message: '文件未找到' },
          { status: 404 }
        );
      }
      
      // 检查文件是否存在
      if (!existsSync(targetFilePath)) {
        return NextResponse.json(
          { message: '文件不存在' },
          { status: 404 }
        );
      }
      
      // 获取文件统计信息
      const fileStats = await stat(targetFilePath);
      
      // 检查文件大小（限制预览大小为1MB）
      if (fileStats.size > 1024 * 1024) {
        return NextResponse.json(
          { message: '文件过大，无法预览' },
          { status: 400 }
        );
      }
      
      // 解析文件内容
      const fileContent = await parseDocument(targetFilePath, targetFileMime);
      
      return NextResponse.json(
        { 
          filename: previewFile,
          content: fileContent,
          size: fileStats.size
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('文件预览错误:', error);
      return NextResponse.json(
        { message: `文件预览失败: ${error.message || '未知错误'}` },
        { status: 500 }
      );
    }
  }
  
  // 原有的文件列表逻辑
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const vectorizationDir = path.join(process.cwd(), 'vectorization');
    
    // 检查目录是否存在
    if (!existsSync(uploadDir) || !existsSync(vectorizationDir)) {
      return NextResponse.json({ files: [] }, { status: 200 });
    }

    // 读取上传目录中的文件
    const uploadedFiles = await readdir(uploadDir);
    
    // 读取向量化目录中的文件
    const vectorizedFiles = await readdir(vectorizationDir);
    
    // 读取会话数据
    const sessions = await readSessionsFromFile();
    
    // 构建文件列表
    const files = [];
    
    for (const filename of uploadedFiles) {
      try {
        // 从上传文件名中提取原始文件名（去掉时间戳前缀）
        // 格式: {timestamp}-{originalFilename}
        const originalFilename = filename.replace(/^\d+-/, '');
        
        // 查找对应的向量化文件
        // 向量化文件命名格式: {sessionId}.json
        let vectorFile = null;
        let vectorFilename = null;
        let sessionId = null;
        let sessionExists = false;
        
        // 先尝试通过文件内容查找匹配的向量化文件
        for (const vf of vectorizedFiles) {
          if (!vf.endsWith('.json')) continue;
          try {
            const vectorFilePath = path.join(vectorizationDir, vf);
            const fileContent = await readFile(vectorFilePath, 'utf-8');
            const vectorData = JSON.parse(fileContent);
            if (vectorData.filename === originalFilename) {
              vectorFile = vf;
              vectorFilename = vf;
              sessionId = vectorData.sessionId;
              sessionExists = !!sessions[sessionId]; // 检查会话是否存在
              break;
            }
          } catch {
            // 解析失败，继续查找下一个文件
          }
        }
        
        files.push({
          name: originalFilename,
          sessionId: sessionId,
          hasVectorData: !!vectorFile,
          sessionExists: sessionExists,
          vectorFilename: vectorFilename
        });
      } catch (fileError: any) {
        console.error(`处理文件 ${filename} 时出错:`, fileError);
        // 从上传文件名中提取原始文件名（去掉时间戳前缀）
        const originalFilename = filename.replace(/^\d+-/, '');
        
        // 即使单个文件出错，也继续处理其他文件
        files.push({
          name: originalFilename,
          sessionId: null,
          hasVectorData: false,
          sessionExists: false,
          vectorFilename: null
        });
      }
    }
    
    return NextResponse.json({ files }, { status: 200 });
  } catch (error: any) {
    console.error('获取文件列表错误:', error);
    return NextResponse.json(
      { message: `获取文件列表失败: ${error.message || '未知错误'}`, files: [] }, 
      { status: 500 }
    );
  }
}

// 切换到指定文件
export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json(
        { message: '文件名不能为空' },
        { status: 400 }
      );
    }
    
    const vectorizationDir = path.join(process.cwd(), 'vectorization');
    
    // 检查目录是否存在
    if (!existsSync(vectorizationDir)) {
      return NextResponse.json(
        { message: '向量化目录不存在' },
        { status: 404 }
      );
    }
    
    // 查找对应的向量化文件
    const vectorizedFiles = await readdir(vectorizationDir);
    let vectorFile = null;
    
    // 通过读取文件内容查找匹配的向量化文件
    for (const vf of vectorizedFiles) {
      if (!vf.endsWith('.json')) continue;
      try {
        const vectorFilePath = path.join(vectorizationDir, vf);
        const fileContent = await readFile(vectorFilePath, 'utf-8');
        const vectorData = JSON.parse(fileContent);
        if (vectorData.filename === filename) {
          vectorFile = vf;
          break;
        }
      } catch {
        // 解析失败，继续查找下一个文件
      }
    }
    
    if (!vectorFile) {
      return NextResponse.json(
        { message: '未找到该文件的向量化数据' },
        { status: 404 }
      );
    }
    
    // 读取向量化数据
    const vectorFilePath = path.join(vectorizationDir, vectorFile);
    const vectorData = JSON.parse(await readFile(vectorFilePath, 'utf-8'));
    
    // 检查会话是否仍然存在
    const sessions = await readSessionsFromFile();
    const sessionExists = !!sessions[vectorData.sessionId];
    
    if (!sessionExists) {
      // 如果会话不存在，重新创建会话数据
      // 这里需要重新向量化，但在实际应用中应该从存储的向量化数据重建向量存储
      return NextResponse.json(
        { 
          message: '会话已过期，需要重新处理文件',
          sessionId: null,
          filename: vectorData.filename,
          requiresReprocessing: true
        },
        { status: 200 }
      );
    }
    
    // 返回会话信息
    return NextResponse.json(
      { 
        message: '文件切换成功',
        sessionId: vectorData.sessionId,
        filename: vectorData.filename,
        requiresReprocessing: false
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('切换文件错误:', error);
    return NextResponse.json(
      { message: `切换文件失败: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}

// 删除文件
export async function DELETE(request: Request) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { message: '文件名不能为空' },
        { status: 400 }
      );
    }

    // 读取会话数据
    const sessions: Record<string, SessionData> = await readSessionsFromFile();
    
    // 查找对应的会话
    let sessionIdToDelete: string | null = null;
    for (const [sessionId, sessionData] of Object.entries(sessions)) {
      if (sessionData.filename === filename) {
        sessionIdToDelete = sessionId;
        break;
      }
    }

    // 删除会话数据（如果找到）
    if (sessionIdToDelete) {
      delete sessions[sessionIdToDelete];
      await writeSessionsToFile(sessions);
    }

    // 查找并删除对应的向量化文件
    const vectorizationDir = path.join(process.cwd(), 'vectorization');
    const vectorFiles = await readdir(vectorizationDir);
    
    for (const vectorFile of vectorFiles) {
      if (!vectorFile.endsWith('.json')) continue;
      
      try {
        const vectorFilePath = path.join(vectorizationDir, vectorFile);
        const fileContent = await readFile(vectorFilePath, 'utf-8');
        const vectorData = JSON.parse(fileContent) as VectorData;
        
        // 如果向量化文件关联的是要删除的文件
        if (vectorData.filename === filename) {
          await unlink(vectorFilePath);
        }
      } catch (error) {
        console.error(`解析向量化文件 ${vectorFile} 失败:`, error);
        // 继续处理其他文件
      }
    }
    
    // 删除上传目录中的文件
    const uploadDir = path.join(process.cwd(), 'uploads');
    const uploadedFiles = await readdir(uploadDir);
    
    // 查找并删除所有匹配的上传文件
    for (const uploadedFilename of uploadedFiles) {
      // 文件名格式: {timestamp}-{originalFilename}
      const originalFilename = uploadedFilename.replace(/^\d+-/, '');
      if (originalFilename === filename) {
        const filePath = path.join(uploadDir, uploadedFilename);
        try {
          await unlink(filePath);
        } catch (unlinkError) {
          console.error('删除上传文件失败:', unlinkError);
        }
      }
    }

    return NextResponse.json(
      { 
        message: '文件已删除',
        filename
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('删除文件失败:', error);
    return NextResponse.json(
      { message: `删除文件失败: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}
