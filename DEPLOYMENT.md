# 部署到 Vercel

本文档说明如何将 AI 简历助手项目部署到 Vercel 平台。

## 部署步骤

### 1. 准备工作

在部署之前，请确保您已完成以下准备工作：

1. 注册一个 [Vercel 账户](https://vercel.com)
2. 准备好项目的 OpenAI API 密钥或其他相关服务密钥
3. 确保代码已推送到 GitHub、GitLab 或 Bitbucket 仓库

### 2. 通过 Vercel Dashboard 部署

1. 登录您的 Vercel 账户
2. 点击 "New Project"
3. 导入您的 Git 仓库
4. 配置项目：
   - Framework Preset: 选择 "Next.js"
   - Root Directory: 如果项目在仓库根目录则留空，否则指定目录路径
5. 点击 "Deploy"

### 3. 环境变量配置

在 Vercel 项目设置中，您需要配置以下环境变量：

- `OPENAI_API_KEY` - 您的 OpenAI API 密钥（必须）
- `DEEPSEEK_API_KEY` - 如果使用 DeepSeek API
- `QWEN_API_KEY` - 如果使用通义千问 API

在 Vercel 项目页面中：
1. 进入 Settings > Environment Variables
2. 添加上述需要的环境变量

### 4. 自定义域名（可选）

如果您想使用自定义域名：
1. 进入 Settings > Domains
2. 添加您的自定义域名
3. 按照指示配置 DNS 记录

## 重要注意事项

### 文件上传限制

Vercel 对 Serverless Functions 有一些限制：
- 最大执行时间：10 秒（免费版）或 60 秒（Pro 版）
- 最大请求体大小：5MB（免费版）或 100MB（Pro 版）

对于较大的简历文件，建议升级到 Vercel Pro 套餐，或考虑实现客户端直接上传到云存储的方案。

### 内存向量存储

当前项目使用内存向量存储，这意味着：
- 每次部署或冷启动都会丢失向量数据
- 不同的 Vercel 实例之间无法共享向量数据
- 建议将来考虑使用持久化向量数据库如 Pinecone 或 Weaviate

### 性能优化

为了在 Vercel 上获得最佳性能：
1. 确保所有外部包都在 `serverExternalPackages` 中正确声明
2. 避免在服务端函数中进行过多的计算
3. 对于大文件处理，考虑使用流式处理或后台作业

## 本地开发与生产环境的区别

- 环境变量在 Vercel 中通过项目设置配置，而非 .env 文件
- 文件系统访问在 Vercel Serverless Functions 中是临时的和有限的
- 需要根据 Vercel 的执行时间和内存限制优化代码

## 故障排除

### 构建失败

如果遇到构建失败，请检查：
1. 所有依赖是否正确安装
2. `serverExternalPackages` 是否包含了所有需要的外部包
3. TypeScript 错误或 ESLint 错误

### 运行时错误

如果部署成功但运行时出错，请检查：
1. 环境变量是否正确配置
2. API 密钥是否有效
3. 日志中是否有内存不足或超时错误

## 支持的 Node.js 版本

Vercel 支持最新的 Node.js 版本。确保您的 package.json 中的 engines 字段与 Vercel 支持的版本兼容：

```json
{
  "engines": {
    "node": ">=18.x"
  }
}
```