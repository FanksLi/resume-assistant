import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 会话文件路径
const getSessionFilePath = () => path.join(process.cwd(), 'sessions.json');

/**
 * 从文件中读取会话数据
 * @returns 会话数据对象
 */
export async function readSessionsFromFile() {
  try {
    const sessionFile = getSessionFilePath();
    if (existsSync(sessionFile)) {
      const data = await readFile(sessionFile, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('读取会话文件失败:', error);
    return {};
  }
}

/**
 * 将会话数据写入文件
 * @param sessions 会话数据对象
 */
export async function writeSessionsToFile(sessions: any) {
  try {
    const sessionFile = getSessionFilePath();
    await writeFile(sessionFile, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('写入会话文件失败:', error);
  }
}