import { extractText } from 'unpdf';
import { readFile } from 'fs/promises';
import mammoth from 'mammoth';

/**
 * 解析PDF文件
 * @param filePath 文件路径
 * @returns 解析后的文本内容
 */
export async function parsePDF(filePath: string): Promise<string> {
  try {
    const buffer = await readFile(filePath);
    return await parsePDFBuffer(buffer);
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error(`PDF文件解析失败: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * 直接解析PDF buffer
 * @param buffer 文件buffer
 * @returns 解析后的文本内容
 */
export async function parsePDFBuffer(buffer: Buffer): Promise<string> {
  try {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return text;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error(`PDF文件解析失败: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * 解析TXT文件
 * @param filePath 文件路径
 * @returns 解析后的文本内容
 */
export async function parseTXT(filePath: string): Promise<string> {
  try {
    const buffer = await readFile(filePath);
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('TXT解析错误:', error);
    throw new Error('TXT文件解析失败');
  }
}

/**
 * 直接解析TXT buffer
 * @param buffer 文件buffer
 * @returns 解析后的文本内容
 */
export async function parseTXTBuffer(buffer: Buffer): Promise<string> {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('TXT解析错误:', error);
    throw new Error('TXT文件解析失败');
  }
}

/**
 * 解析DOCX文件
 * @param filePath 文件路径
 * @returns 解析后的文本内容
 */
export async function parseDOCX(filePath: string): Promise<string> {
  try {
    const buffer = await readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX解析错误:', error);
    throw new Error('DOCX文件解析失败');
  }
}

/**
 * 直接解析DOCX buffer
 * @param buffer 文件buffer
 * @returns 解析后的文本内容
 */
export async function parseDOCXBuffer(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX解析错误:', error);
    throw new Error('DOCX文件解析失败');
  }
}

/**
 * 根据文件扩展名选择合适的解析器
 * @param filePath 文件路径
 * @param fileType 文件MIME类型
 * @returns 解析后的文本内容
 */
export async function parseDocument(filePath: string | Buffer, fileType: string): Promise<string> {
  // 如果传入的是 buffer（生产环境），则使用 buffer 解析函数
  if (filePath instanceof Buffer) {
    switch (fileType) {
      case 'application/pdf':
        return await parsePDFBuffer(filePath);
      case 'text/plain':
        return await parseTXTBuffer(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await parseDOCXBuffer(filePath);
      default:
        throw new Error(`不支持的文件类型: ${fileType}`);
    }
  }
  
  // 如果传入的是文件路径（开发环境），则使用路径解析函数
  switch (fileType) {
    case 'application/pdf':
      return await parsePDF(filePath as string);
    case 'text/plain':
      return await parseTXT(filePath as string);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return await parseDOCX(filePath as string);
    default:
      throw new Error(`不支持的文件类型: ${fileType}`);
  }
}