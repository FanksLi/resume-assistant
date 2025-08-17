// 数据库连接模拟文件
// 项目本身不使用数据库，但某些依赖包在构建时会尝试连接数据库
// 此文件用于防止构建错误

// 空的数据库连接实现
const db = {
  // 模拟数据库连接对象
  query: async (sql: string, params?: any[]) => {
    console.log('Database query skipped - no database required for this project');
    return { rows: [] };
  }
};

export { db };