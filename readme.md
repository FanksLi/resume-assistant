# AI简历助手

一个基于AI的简历优化工具，帮助用户改善简历内容并提供专业建议。

## 功能特性

- 支持PDF、DOCX、TXT格式的简历文件解析
- AI驱动的简历优化建议
- 智能问答功能，基于简历内容回答问题
- 多文件管理，支持同时处理多个简历

## 环境要求

- Node.js >= 18.x
- npm 或 yarn

## 安装步骤

1. 克隆项目代码:
   ```
   git clone <项目地址>
   ```

2. 安装依赖:
   ```
   npm install
   ```

3. 设置环境变量:
   创建 `.env.local` 文件并添加以下内容:
   ```
   OPENAI_API_KEY=你的OpenAI API密钥
   ```

4. 启动开发服务器:
   ```
   npm run dev
   ```

## 构建项目

### 开发环境构建
```
npm run build
```

### 生产环境构建
在不同操作系统上设置环境变量的方式不同：

**Windows (cmd):**
```
set SKIP_DB_MIGRATE=true && next build
```

**Windows (PowerShell):**
```
$env:SKIP_DB_MIGRATE="true"; npm run build
```

**Linux/Mac:**
```
SKIP_DB_MIGRATE=true npm run build
```

或者安装 cross-env 包以实现跨平台环境变量设置:
```
npm install --save-dev cross-env
```

然后修改 package.json 中的构建脚本:
```json
"scripts": {
  "build": "cross-env SKIP_DB_MIGRATE=true next build"
}
```

## 部署

项目支持 Vercel 部署。部署时需要在 Vercel 环境变量设置中添加:
- SKIP_DB_MIGRATE = true
- OPENAI_API_KEY = 你的OpenAI API密钥
- NEXT_TELEMETRY_DISABLED = 1

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- LangChain
- OpenAI API
- pdf-parse (PDF解析)
- mammoth (DOCX解析)

## 目录结构

```
├── src/
│   ├── app/                 # Next.js App Router目录
│   │   ├── api/             # API路由
│   │   ├── components/      # React组件
│   │   └── lib/             # 工具库
│   └── static/              # 静态文件
├── uploads/                 # 上传文件目录（开发环境）
├── vectorization/           # 向量化数据存储目录（开发环境）
└── lib/                     # 数据库相关代码
```

## 注意事项

1. 项目使用内存存储，重启服务会丢失数据
2. 在Vercel等无服务器环境中，文件系统是只读的，只允许写入/tmp目录
3. 项目在生产环境中会隐藏文件上传、更新和删除功能
4. 静态文件存储在static目录中，用于演示和测试