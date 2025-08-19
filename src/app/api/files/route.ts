import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile, readdir, unlink, stat, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { readSessionsFromFile, writeSessionsToFile } from '@/app/lib/sessionManager';
import { parseDocument } from '@/app/lib/documentProcessor';
import { splitText } from '@/app/lib/textSplitter';

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
      const uploadDir = path.join('/tmp', 'uploads');
      
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
    const uploadDir = path.join('/tmp', 'uploads');
    const vectorizationDir = path.join('/tmp', 'vectorization');
    
    // 检查目录是否存在
    if (!existsSync(uploadDir) || !existsSync(vectorizationDir)) {
      // 如果目录不存在，创建它们
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      if (!existsSync(vectorizationDir)) {
        await mkdir(vectorizationDir, { recursive: true });
      }
      
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
    
    const vectorizationDir = path.join('/tmp', 'vectorization');
    
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

// 更新文件
export async function PUT(request: Request) {
  try {
    // 检查是否为生产环境，如果是则需要密码验证
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      const formData = await request.formData();
      const password = formData.get('password') as string | null;
      
      // 验证密码
      if (!password || password !== "7878") {
        return NextResponse.json(
          { message: '密码错误' },
          { status: 401 }
        );
      }
    }
    
    // 使用 /tmp 目录进行文件存储（Vercel 环境中唯一可写的目录）
    const uploadDir = path.join('/tmp', 'uploads');
    const vectorizationDir = path.join('/tmp', 'vectorization');
    
    // 确保 /tmp 目录中的子目录存在
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    if (!existsSync(vectorizationDir)) {
      await mkdir(vectorizationDir, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const originalFilename = formData.get('originalFilename') as string | null;

    if (!file) {
      return NextResponse.json(
        { message: '没有找到文件' },
        { status: 400 }
      );
    }

    if (!originalFilename) {
      return NextResponse.json(
        { message: '缺少原始文件名' },
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

    // 处理文件内容并保存到 /tmp/uploads 目录
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 删除同名的旧文件
    const uploadedFiles = await readdir(uploadDir);
    
    for (const existingFile of uploadedFiles) {
      const existingOriginalName = existingFile.replace(/^\d+-/, '');
      if (existingOriginalName === originalFilename) {
        const existingFilePath = path.join(uploadDir, existingFile);
        await unlink(existingFilePath);
      }
    }
    
    const filename = `${Date.now()}-${file.name}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // 解析文档内容
    let text = '';
    // 在所有环境中都处理文件路径
    text = await parseDocument(filepath, file.type);
    
    // 文本分片
    const texts = await splitText(text, 1000, 200);
    
    // 查找并删除旧的向量化数据
    const vectorFiles = await readdir(vectorizationDir);
    let existingSessionId = null;
    
    for (const vectorFile of vectorFiles) {
      if (!vectorFile.endsWith('.json')) continue;
      
      try {
        const vectorFilePath = path.join(vectorizationDir, vectorFile);
        const fileContent = await readFile(vectorFilePath, 'utf-8');
        const vectorData = JSON.parse(fileContent);
        
        // 如果向量化文件关联的是要更新的文件
        if (vectorData.filename === originalFilename) {
          // 保存现有sessionId以便重用
          existingSessionId = vectorData.sessionId;
          await unlink(vectorFilePath);
        }
      } catch (error) {
        console.error(`解析向量化文件 ${vectorFile} 失败:`, error);
        // 继续处理其他文件
      }
    }
    
    // 如果没有现有的sessionId，则生成新的
    const sessionId = existingSessionId || `session-${Date.now()}`;
    
    // 读取现有会话数据
    const sessions = await readSessionsFromFile();
    
    // 如果有现有的会话数据，先删除它
    if (existingSessionId && sessions[existingSessionId]) {
      delete sessions[existingSessionId];
    }
    
    // 更新会话数据
    sessions[sessionId] = {
      filename: file.name,
      createdAt: new Date().toISOString()
    };
    
    // 写入会话数据到文件
    await writeSessionsToFile(sessions);

    // 将向量化数据存储到 /tmp/vectorization 目录
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

    return NextResponse.json(
      { 
        message: '简历更新成功',
        sessionId: sessionId,
        chunks: texts.length
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('简历更新错误:', error);
    return NextResponse.json(
      { message: '简历更新失败', error: error.message || '未知错误' },
      { status: 500 }
    );
  }
}

// 删除文件
export async function DELETE(request: Request) {
  try {
    // 先读取请求体
    const body = await request.json();
    
    // 检查是否为生产环境，如果是则需要密码验证
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      const { password } = body;
      
      // 验证密码
      if (!password || password !== "7878") {
        return NextResponse.json(
          { message: '密码错误' },
          { status: 401 }
        );
      }
    }
    
    const { filename } = body;

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
    const vectorizationDir = path.join('/tmp', 'vectorization');
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
    const uploadDir = path.join('/tmp', 'uploads');
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