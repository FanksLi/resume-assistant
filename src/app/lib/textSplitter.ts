import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

/**
 * 将文本分割成片段
 * @param text 输入文本
 * @param chunkSize 每个片段的最大长度
 * @param chunkOverlap 片段间的重叠长度
 * @returns 分割后的文本片段数组
 */
export async function splitText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<string[]> {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });

    const docs = await splitter.createDocuments([text]);
    return docs.map(doc => doc.pageContent);
  } catch (error) {
    console.error("文本分割错误:", error);
    throw new Error("文本分割失败");
  }
}