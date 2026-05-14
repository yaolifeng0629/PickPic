# PickPic 代码质量改进 — 设计文档

## 日期

2026-05-13

## 背景

随着功能增加，代码质量债逐渐累积：

- 无 ESLint，代码风格不统一
- 多处使用 `any` 和 `Function`，类型安全缺失
- `extractor.ts` 820 行，违反单一职责
- 无自动化测试，回归风险高
- TypeScript 5.3.3 较旧

## 目标

1. 安装 ESLint + Prettier 集成配置
2. 消除所有 `any` 和 `Function` 类型
3. 将 `extractor.ts` 拆分为独立模块
4. 安装测试框架（Vitest + Playwright）
5. 更新 TypeScript 到 5.5+

## 非目标

- 不重构业务逻辑（只拆分和类型化，不改变行为）
- 不写端到端测试（先覆盖单元测试）
- 不引入新的构建工具（保持 Plasmo + Vite）

## 技术决策

### ESLint 配置

使用 `typescript-eslint` 官方推荐配置：

```json
{
  "devDependencies": {
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0"
  }
}
```

规则重点：
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-unsafe-function-type`: error
- `@typescript-eslint/explicit-function-return-type`: warn（对工具函数）
- `react-hooks/rules-of-hooks`: error
- `react-hooks/exhaustive-deps`: warn

### 测试框架

| 框架 | 用途 | 原因 |
|------|------|------|
| **Vitest** | 单元测试 | Vite 原生集成，配置简单，速度快 |
| **Playwright** | E2E 测试 | Chrome 扩展测试需要真实浏览器 |
| **@testing-library/react** | 组件测试 | 轻量，与 Vitest 配合良好 |

### TypeScript 升级

从 5.3.3 升级到 5.5.x（最新稳定版）。需检查：
- Plasmo 是否兼容（通常兼容）
- `@types/chrome` 是否需要同步升级

## 架构

### 1. ESLint 配置

新增 `.eslintrc.cjs`：

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-function-type': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react/react-in-jsx-scope': 'off', // React 18 不需要
  },
  ignorePatterns: ['dist/', 'build/', 'node_modules/', '.plasmo/'],
}
```

新增脚本：
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### 2. 类型修复

**`background.ts`**

```ts
// 替换前
function handleDownloadImages(data: any, sendResponse: Function)

// 替换后
interface DownloadImagesRequest {
  images: ImageInfo[]
  articleTitle: string
}

function handleDownloadImages(
  data: DownloadImagesRequest,
  sendResponse: (response: { success?: boolean; error?: string }) => void
): void
```

**`store/` 各文件**
- 确保所有 store 的 state 和 actions 有完整类型
- Zustand 的 `create` 调用加泛型参数

**`lib/` 各工具函数**
- 所有函数参数和返回值加类型
- 用 `unknown` 替代 `any` 并在使用时做类型收窄

### 3. 拆分 `extractor.ts`

当前 820 行，拆分为：

```
contents/
├── extractor.ts              # 入口，消息路由，初始化（< 100 行）
├── extractors/
│   ├── article-extractor.ts  # 文章信息提取（标题、作者等）
│   ├── image-extractor.ts    # 图片提取（从 lib/ 移入，或引用）
│   ├── video-extractor.ts    # 视频提取（DOM 视频、脚本、结构化数据）
│   └── network-interceptor.ts # fetch/XHR 拦截、Performance API
```

**`extractor.ts` 重构后：**

```ts
import { extractArticleInfo } from './extractors/article-extractor'
import { extractImages } from './extractors/image-extractor'
import { extractVideos } from './extractors/video-extractor'
import { initNetworkInterceptor } from './extractors/network-interceptor'

// 初始化
initNetworkInterceptor()

// 消息路由
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.type) {
    case 'EXTRACT_CONTENT': {
      const article = extractArticleInfo()
      const images = extractImages()
      const videos = extractVideos()
      sendResponse({ article, images: [...images, ...videos], isWechatPage: isWechatArticlePage() })
      break
    }
    // ...
  }
  return true
})
```

**`video-extractor.ts` 进一步拆分：**

```
contents/extractors/videos/
├── dom-videos.ts         # video 标签提取
├── script-videos.ts      # script 标签正则提取
├── meta-videos.ts        # og:video meta 标签
├── player-detectors.ts   # video.js 等播放器检测
└── network-videos.ts     # 网络拦截结果
```

### 4. 测试框架配置

**`vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
})
```

**测试目录结构：**

```
test/
├── setup.ts                 # 全局 setup
├── unit/
│   ├── lib/
│   │   ├── image-utils.test.ts
│   │   ├── video-format-utils.test.ts
│   │   └── hls-downloader.test.ts
│   └── store/
│       └── settings-store.test.ts
└── e2e/
    └── sidepanel.spec.ts    # Playwright
```

**优先测试的模块（影响最大、最容易测）：**

1. `lib/image-utils.ts` — URL 解析、扩展名提取、文件名清理
2. `lib/video-format-utils.ts` — magic bytes 检测
3. `lib/hls-utils.ts` — m3u8 解析
4. `store/settings-store.ts` — storage 读写逻辑

**示例测试：**

```ts
// test/unit/lib/image-utils.test.ts
import { describe, it, expect } from 'vitest'
import { getImageExtension, sanitizeFileName, normalizeUrlForDedup } from '~/lib/image-utils'

describe('getImageExtension', () => {
  it('extracts jpg from URL with query params', () => {
    expect(getImageExtension('https://example.com/img.jpg?w=800')).toBe('jpg')
  })

  it('returns default jpg for unknown extension', () => {
    expect(getImageExtension('https://example.com/img')).toBe('jpg')
  })
})

describe('sanitizeFileName', () => {
  it('replaces special characters with underscore', () => {
    expect(sanitizeFileName('hello:world')).toBe('hello_world')
  })
})
```

### 5. TypeScript 升级

```bash
pnpm update typescript @types/node @types/react @types/react-dom
```

检查项：
- [ ] `pnpm dev` 正常启动
- [ ] `pnpm build` 无类型错误
- [ ] Plasmo 无兼容性问题

## 与现有代码集成

### 修改顺序（减少冲突）

1. 先升级 TypeScript（影响最小，先确认环境 OK）
2. 安装 ESLint 和测试框架
3. 拆分 `extractor.ts`（第二批完成后进行，避免与图片提取改动冲突）
4. 修复类型（逐个文件处理，提交清晰）
5. 编写测试（为新拆分的模块优先写）

### CI 集成（可选）

在 GitHub Actions 中添加：

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

## 验收标准

- [ ] `pnpm lint` 无 error
- [ ] `pnpm test` 全部通过
- [ ] `pnpm build` 成功
- [ ] `extractor.ts` 拆分后每文件 < 200 行
- [ ] 零 `any` 类型使用
- [ ] 零 `Function` 类型使用
- [ ] TypeScript 升级到 5.5.x
