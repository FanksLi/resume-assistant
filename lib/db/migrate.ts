// 数据库迁移模拟文件
// 项目本身不使用数据库，但某些依赖包在构建时会尝试运行迁移脚本
// 此文件用于防止构建错误

async function runMigrate() {
  // 空的迁移实现
  console.log('Skipping database migration - no database required for this project');
}

export { runMigrate };