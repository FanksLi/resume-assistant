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
- `SKIP_DB_MIGRATE` - 设置为 "true" 以跳过数据库迁移（解决部署错误）
- `NPM_LEGACY_PEER_DEPS` - 设置为 "true" 以解决 npm 依赖冲突问题（特别是当遇到 OpenTelemetry 包版本冲突时）

在 Vercel 项目页面中：
1. 进入 Settings > Environment Variables
2. 添加上述需要的环境变量
3. 对于敏感变量（如 API 密钥），建议标记为 "Production" 环境变量
4. 点击 "Save" 保存配置

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

### 数据库迁移错误

如果遇到如下错误：
```
Error: POSTGRES_URL is not defined
    at runMigrate (/vercel/path0/lib/db/migrate.ts:12:11)
```

或者：
```
TypeError: Invalid URL
    at new URL (node:internal/url:825:25)
```

这是由于某些依赖包在构建时尝试运行数据库迁移脚本，但项目本身并不使用数据库。解决方法如下：

1. 项目中已添加了数据库模拟文件以防止构建错误：
   - [lib/db/migrate.ts](file://e:\studySpace\ai\resume-assistant\lib\db\migrate.ts) - 空的迁移实现
   - [lib/db/index.ts](file://e:\studySpace\ai\resume-assistant\lib\db\index.ts) - 空的数据库连接实现

2. 在 Vercel 环境变量中添加：
   ```
   SKIP_DB_MIGRATE=true
   ```

3. 构建脚本已更新为包含 SKIP_DB_MIGRATE 环境变量：
   ```json
   "build": "SKIP_DB_MIGRATE=true next build"
   ```

如果仍有问题，请确保以下文件存在于项目中：
- `lib/db/migrate.ts` - 数据库迁移模拟文件
- `lib/db/index.ts` - 数据库连接模拟文件

这些文件会拦截所有数据库相关操作，防止构建过程中出现数据库连接错误。

这些文件提供了空实现，防止构建过程中出现数据库相关错误。

### 依赖冲突错误

如果遇到如下错误：
```
npm error ERESOLVE unable to resolve dependency tree
npm error While resolving: ai-chatbot@3.1.0
npm error Found: @opentelemetry/api-logs@0.200.0
...
npm error peer @opentelemetry/api-logs@">=0.46.0 <0.200.0" from @vercel/otel@1.13.0
```

这是由于不同版本的 OpenTelemetry 包之间的兼容性问题导致的。解决方法如下：

1. 项目中已添加了 [.npmrc](file://e:\studySpace\ai\resume-assistant\.npmrc) 配置文件，包含 `legacy-peer-deps=true` 设置
2. 这将告诉 npm 使用旧版本的依赖解析算法，忽略 peer dependencies 冲突

### Vercel 构建超时

如果构建过程超时，请尝试以下方法：
1. 检查是否在构建过程中执行了不必要的任务
2. 确保所有外部依赖都已正确配置
3. 考虑优化构建过程，移除不必要的步骤

## 支持的 Node.js 版本

Vercel 支持最新的 Node.js 版本。确保您的 package.json 中的 engines 字段与 Vercel 支持的版本兼容：

```json
{
  "engines": {
    "node": ">=18.x"
  }
}
```