import pdfParse from 'pdf-parse';
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
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error('PDF文件解析失败');
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
 * 根据文件扩展名选择合适的解析器
 * @param filePath 文件路径
 * @param fileType 文件MIME类型
 * @returns 解析后的文本内容
 */
export async function parseDocument(filePath: string, fileType: string): Promise<string> {
  switch (fileType) {
    case 'application/pdf':
      return await parsePDF(filePath);
    case 'text/plain':
      return await parseTXT(filePath);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      // 对于DOCX文件，目前简化处理，实际应该使用mammoth等库
      return await parseDOCX(filePath);
    default:
      throw new Error(`不支持的文件类型: ${fileType}`);
  }
}