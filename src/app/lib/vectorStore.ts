import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";
// 使用 langchain/core/embeddings 中的 Embeddings 接口
import { Embeddings } from "@langchain/core/embeddings";
// 使用 langchain/openai 中的 OpenAIEmbeddings 类
import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * 创建向量存储
 * @param texts 文本块数组
 * @param openAIApiKey OpenAI API密钥
 * @returns 向量存储实例
 */
// 自定义阿里云千问嵌入模型类
class QwenEmbeddings extends Embeddings {
  apiKey: string;
  baseUrl: string;
  model: string;

  constructor(fields?: {
    openAIApiKey?: string;
    configuration?: {
      baseURL?: string;
    };
    modelName?: string;
  }) {
    super({});

    this.apiKey = fields?.openAIApiKey || process.env.QWEN_API_KEY || "";
    this.baseUrl = fields?.configuration?.baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.model = fields?.modelName || "text-embedding-v4";
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const { OpenAI } = await import("openai");
    
    const openai = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
    });

    const embeddings = [];
    for (const text of texts) {
      try {
        const response = await openai.embeddings.create({
          model: this.model,
          input: text,
        });
        
        embeddings.push(response.data[0].embedding);
      } catch (error: any) {
        console.error("嵌入文档时出错:", error);
        throw new Error(`嵌入文档失败: ${error.message || error.toString() || '未知错误'}`);
      }
    }

    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const { OpenAI } = await import("openai");
    
    const openai = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
    });

    try {
      const response = await openai.embeddings.create({
        model: this.model,
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error: any) {
      console.error("查询嵌入时出错:", error);
      throw new Error(`查询嵌入失败: ${error.message || error.toString() || '未知错误'}`);
    }
  }
}

/**
 * 创建向量存储
 * @param texts 文本块数组
 * @returns 向量存储实例
 */
export async function createVectorStore(
  texts: string[]
): Promise<MemoryVectorStore> {
  try {
    // 创建文档对象数组
    const docs = texts.map(
      (text, index) => 
        new Document({
          pageContent: text,
          metadata: { id: index }
        })
    );

    // 检查是否配置了阿里云千问API密钥
    const qwenApiKey = process.env.QWEN_API_KEY;
    let embeddings: Embeddings;

    if (qwenApiKey) {
      // 使用阿里云千问的text-embedding-v4模型
      embeddings = new QwenEmbeddings({
        openAIApiKey: qwenApiKey,
        modelName: "text-embedding-v4",
        configuration: {
          baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        }
      });
    } else {
      // 如果没有配置千问API密钥，则降级到OpenAI的嵌入模型
      const openAIApiKey = process.env.OPENAI_API_KEY;
      if (openAIApiKey) {
        embeddings = new OpenAIEmbeddings({
          openAIApiKey: openAIApiKey,
        });
      } else {
        throw new Error("未配置任何嵌入模型的API密钥，请配置QWEN_API_KEY或OPENAI_API_KEY");
      }
    }

    // 创建内存向量存储
    const vectorStore = await MemoryVectorStore.fromDocuments(
      docs,
      embeddings
    );

    return vectorStore;
  } catch (error) {
    console.error("向量存储创建错误:", error);
    throw new Error("向量存储创建失败");
  }
}

/**
 * 在向量存储中搜索相似文档
 * @param vectorStore 向量存储实例
 * @param query 查询文本
 * @param k 返回结果数量
 * @returns 相似文档数组
 */
export async function searchSimilarDocuments(
  vectorStore: MemoryVectorStore,
  query: string,
  k: number = 4
): Promise<Document[]> {
  try {
    const results = await vectorStore.similaritySearch(query, k);
    return results;
  } catch (error) {
    console.error("相似文档搜索错误:", error);
    throw new Error("相似文档搜索失败");
  }
}