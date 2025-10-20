# PickPic - 开发任务清单

本文档列出了 PickPic 插件的完整开发任务，按阶段组织，每个任务都可以独立完成。

---

## 阶段一：环境配置和依赖安装

### 1.1 安装 UI 相关依赖

- [x] 安装 Tailwind CSS 及相关依赖
  ```bash
  pnpm add -D tailwindcss postcss autoprefixer
  pnpm dlx tailwindcss init -p
  ```

- [x] 安装 shadcn-ui 依赖
  ```bash
  pnpm add class-variance-authority clsx tailwind-merge
  pnpm add tailwindcss-animate
  ```

- [x] 安装 Radix UI 组件
  ```bash
  pnpm add @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-scroll-area @radix-ui/react-tabs @radix-ui/react-toast
  ```

- [x] 安装图标库
  ```bash
  pnpm add lucide-react
  ```

### 1.2 安装功能库依赖

- [x] 安装状态管理库
  ```bash
  pnpm add zustand
  ```

- [x] 安装国际化库
  ```bash
  pnpm add i18next react-i18next
  ```

- [x] 安装文件处理库
  ```bash
  pnpm add jszip file-saver
  pnpm add -D @types/file-saver
  ```

### 1.3 配置文件设置

- [x] 配置 `tailwind.config.js`
  - 添加内容路径
  - 配置主题颜色（主题色 #0066FF）
  - 配置动画
  - 添加自定义间距

- [x] 创建 `postcss.config.js`
  - 配置 tailwindcss
  - 配置 autoprefixer

- [x] 更新 `package.json` 的 manifest 配置
  - 添加 permissions: `activeTab`, `storage`, `downloads`, `sidePanel`
  - 添加 host_permissions: `https://mp.weixin.qq.com/*`, `https://mmbiz.qpic.cn/*`
  - 配置 side_panel
  - 配置 icons

- [x] 创建全局样式文件 `styles/global.css`
  - 引入 Tailwind directives
  - 定义全局样式变量

### 1.4 项目图标准备

- [x] 设计并生成插件图标
  - 16x16 (`assets/icon-16.png`)
  - 32x32 (`assets/icon-32.png`)
  - 48x48 (`assets/icon-48.png`)
  - 96x96 (`assets/icon-96.png`)
  - 128x128 (`assets/icon-128.png`)
  - 256x256 (`assets/icon-256.png`)

- [ ] 创建占位图 `assets/placeholder.png`

---

## 阶段二：基础架构搭建

### 2.1 目录结构创建

- [x] 创建目录结构
  ```bash
  mkdir -p components/ui
  mkdir -p components/sidepanel
  mkdir -p components/settings
  mkdir -p components/common
  mkdir -p contents
  mkdir -p background
  mkdir -p lib
  mkdir -p hooks
  mkdir -p store
  mkdir -p types
  mkdir -p locales/en
  mkdir -p locales/zh-CN
  mkdir -p config
  mkdir -p styles
  ```

### 2.2 类型定义

- [x] 创建文章类型 `types/article.ts`
  - 定义 `ArticleInfo` 接口
  - 包含字段：title, author, description, coverImage, url, publishTime

- [x] 创建图片类型 `types/image.ts`
  - 定义 `ImageInfo` 接口
  - 定义 `ImageDownloadOptions` 接口

- [x] 创建消息类型 `types/message.ts`
  - 定义所有消息类型
  - 定义消息响应类型

### 2.3 工具函数

- [x] 创建通用工具函数 `lib/utils.ts`
  - 实现 `cn()` 函数（类名合并）
  - 实现其他通用工具

- [x] 创建图片处理工具 `lib/image-utils.ts`
  - `getImageRealUrl()` - 获取图片真实 URL
  - `isPlaceholderImage()` - 检查是否为占位图
  - `getImageExtension()` - 获取文件扩展名
  - `sanitizeFileName()` - 生成安全文件名

- [x] 创建下载工具 `lib/download-utils.ts`
  - `downloadSingleImage()` - 下载单张图片
  - `downloadImages()` - 批量下载图片

- [x] 创建 ZIP 打包工具 `lib/zip-utils.ts`
  - `zipImages()` - 打包图片为 ZIP

- [x] 创建存储工具 `lib/storage-utils.ts`
  - 封装 Chrome Storage API
  - 提供类型安全的存储接口

### 2.4 shadcn-ui 基础组件

- [x] 创建 Button 组件 `components/ui/button.tsx`
- [x] 创建 Checkbox 组件 `components/ui/checkbox.tsx`
- [x] 创建 Dialog 组件 `components/ui/dialog.tsx`
- [x] 创建 Dropdown Menu 组件 `components/ui/dropdown-menu.tsx`
- [x] 创建 Scroll Area 组件 `components/ui/scroll-area.tsx`
- [x] 创建 Tabs 组件 `components/ui/tabs.tsx`
- [x] 创建 Toast 组件 `components/ui/toast.tsx`

---

## 阶段三：核心功能开发

### 3.1 状态管理（Zustand Store）

- [x] 创建文章状态管理 `store/article-store.ts`
  - 定义 `ArticleState` 接口
  - 实现 `setArticle()`, `setLoading()`, `setError()`, `reset()`

- [x] 创建图片状态管理 `store/image-store.ts`
  - 定义 `ImageState` 接口
  - 实现 `setImages()`, `toggleSelect()`, `selectAll()`, `clearSelection()`

- [x] 创建 UI 状态管理 `store/ui-store.ts`
  - 定义 `UIState` 接口
  - 实现侧边栏、下载进度、对话框状态管理

### 3.2 Content Script - 内容提取器

- [x] 创建内容提取器 `contents/extractor.ts`
  - 实现 `isWechatArticlePage()` - 检测页面类型
  - 实现 `extractArticleInfo()` - 提取文章信息
  - 实现 `extractImages()` - 提取图片列表
  - 配置 Plasmo Content Script config
  - 监听来自 Background 的消息

- [ ] 创建 Content Script 样式 `contents/styles.css`
  - 定义注入页面的样式（如果需要）

- [ ] 测试图片提取逻辑
  - 使用 `.plan/source_article/demo-1.html` 进行测试
  - 验证 `data-src` 属性提取
  - 验证占位图过滤
  - 验证图片命名逻辑

### 3.3 Background Service Worker

- [x] 创建 Background 入口 `background.ts`
  - 监听插件图标点击事件
  - 打开侧边栏
  - 设置消息监听器

- [x] 创建消息处理器
  - 处理 `EXTRACT_CONTENT` 消息
  - 处理 `DOWNLOAD_IMAGES` 消息
  - 处理 `REFRESH_DATA` 消息
  - 实现消息中转逻辑

- [x] 实现下载管理
  - 使用 Chrome Downloads API
  - 处理下载进度
  - 错误处理和重试

### 3.4 React Hooks

- [x] 创建文章提取 Hook `hooks/use-article-extractor.ts`
  - 封装文章提取逻辑
  - 与 Background 通信
  - 更新 Store 状态

- [x] 创建图片下载 Hook `hooks/use-image-download.ts`
  - 封装下载逻辑
  - 进度跟踪
  - 错误处理

- [x] 创建 Toast Hook `hooks/use-toast.ts`
  - 封装 Toast 提示逻辑
  - 支持成功/错误/信息提示

---

## 阶段四：UI 组件开发

### 4.1 侧边栏组件

- [x] 创建侧边栏入口 `sidepanel.tsx`
  - 配置 Plasmo Side Panel
  - 引入 i18next Provider
  - 组合所有子组件
  - 应用全局样式

- [x] 创建头部组件 `components/sidepanel/header.tsx`
  - Logo 展示
  - 应用名称
  - 样式：背景色 #F5F5F5

- [x] 创建标题栏组件 `components/sidepanel/title-bar.tsx`
  - 文章标题显示（单行溢出）
  - 详情按钮 (Info 图标)
  - 刷新按钮 (RefreshCw 图标)
  - 语言切换按钮 (Languages 图标)
  - 设置按钮 (Settings 图标)
  - 按钮 Hover 效果

- [x] 创建图片网格组件 `components/sidepanel/image-grid.tsx`
  - 4 列网格布局
  - 滚动区域
  - 空状态展示
  - 加载状态（骨架屏）

- [x] 创建图片卡片组件 `components/sidepanel/image-card.tsx`
  - 复选框
  - 图片预览
  - 图片名称
  - 选中高亮效果
  - Hover 效果
  - 懒加载

- [x] 创建底部操作组件 `components/sidepanel/footer-actions.tsx`
  - "下载选中图片" 按钮
  - "下载全部图片" 按钮
  - 按钮禁用状态
  - 下载进度展示

- [x] 创建文章详情对话框 `components/sidepanel/article-detail-dialog.tsx`
  - 显示标题、作者、描述
  - 显示封面图
  - 关闭按钮
  - 响应式布局

### 4.2 通用组件

- [ ] 创建加载组件 `components/common/loading.tsx`
  - 旋转加载图标
  - 加载文字
  - 骨架屏

- [ ] 创建空状态组件 `components/common/empty-state.tsx`
  - 空状态图标
  - 提示文字
  - 可自定义

- [ ] 创建语言切换组件 `components/common/language-switcher.tsx`
  - 下拉菜单
  - 中文/English 选项
  - 选中标记
  - 切换语言功能

### 4.3 设置页面组件

- [x] 创建设置页面入口 `tabs/settings.tsx`
  - 配置 Plasmo Settings Page
  - Tab 布局
  - 响应式设计

- [x] 创建关于 Tab `components/settings/about-tab.tsx`
  - 版本号
  - 作者信息
  - 版权信息
  - 插件描述

- [x] 创建隐私 Tab `components/settings/privacy-tab.tsx`
  - 隐私政策声明
  - 数据使用说明

- [x] 创建反馈 Tab `components/settings/feedback-tab.tsx`
  - GitHub Issues 链接
  - 邮箱联系方式
  - 反馈表单（可选）

- [x] 创建捐赠 Tab `components/settings/donate-tab.tsx`
  - 捐赠说明
  - 支付二维码
  - 其他捐赠方式

---

## 阶段五：国际化和配置

### 5.1 国际化配置

- [x] 创建 i18next 配置 `config/i18n.ts`
  - 配置支持的语言
  - 设置默认语言
  - 配置 fallback 语言

- [x] 创建英文翻译文件 `locales/en/translation.json`
  - 翻译所有 UI 文本
  - 组织成模块化结构

- [x] 创建中文翻译文件 `locales/zh-CN/translation.json`
  - 翻译所有 UI 文本
  - 保持与英文文件结构一致

- [x] 在组件中应用国际化
  - 使用 `useTranslation` Hook
  - 替换所有硬编码文本
  - 测试语言切换功能

### 5.2 样式和动画

- [ ] 实现侧边栏打开/关闭动画
  - 滑入/滑出效果
  - 页面内容位移
  - 持续时间 0.3s

- [ ] 实现图片加载动画
  - 加载中旋转动画
  - 图片淡入效果

- [ ] 实现按钮 Hover 效果
  - 背景色变化
  - 轻微阴影

- [ ] 实现 Toast 提示动画
  - 淡入淡出效果
  - 自动消失（3-5 秒）

### 5.3 响应式设计

- [ ] 实现小屏幕适配
  - 图片网格改为 2 列
  - 侧边栏全屏模式

- [ ] 实现大屏幕适配
  - 保持 4 列布局
  - 固定 360px 宽度

---

## 阶段六：测试和优化

### 6.1 功能测试

- [ ] 测试页面检测功能
  - 在微信公众号文章页面测试
  - 在非微信页面测试
  - 验证错误提示

- [ ] 测试文章信息提取
  - 使用 `.plan/source_article/demo-1.html`
  - 验证标题提取
  - 验证作者提取
  - 验证描述和封面提取

- [ ] 测试图片提取
  - 验证所有图片都被提取
  - 验证占位图被过滤
  - 验证 `data-src` 处理
  - 验证图片命名

- [ ] 测试图片选择功能
  - 单选/多选
  - 全选/取消全选
  - 选中状态持久化

- [ ] 测试下载功能
  - 下载单张图片
  - 下载多张图片
  - 下载全部图片
  - ZIP 打包下载
  - 验证文件名和文件夹

- [ ] 测试国际化
  - 切换语言
  - 验证所有文本翻译
  - 验证语言持久化

- [ ] 测试设置页面
  - 所有 Tab 切换
  - 链接跳转
  - 内容展示

### 6.2 性能优化

- [ ] 优化图片加载
  - 实现懒加载
  - 添加加载状态
  - 错误处理

- [ ] 优化状态管理
  - 使用 Zustand selector
  - 避免不必要的重渲染
  - 检查内存泄漏

- [ ] 优化下载性能
  - 限制并发下载数
  - 显示下载进度
  - 实现错误重试

- [ ] 代码分割
  - 按路由分割（如果需要）
  - 动态导入大型组件

### 6.3 错误处理

- [ ] 添加全局错误边界
  - 捕获组件错误
  - 显示友好错误信息

- [ ] 添加网络错误处理
  - 图片加载失败
  - 下载失败
  - 显示错误提示

- [ ] 添加边界情况处理
  - 无图片情况
  - 网络断开
  - 权限不足

### 6.4 代码质量

- [ ] 代码格式化
  - 运行 Prettier
  - 检查代码风格

- [ ] 类型检查
  - 运行 TypeScript 编译
  - 修复类型错误
  - 添加缺失的类型

- [ ] 代码审查
  - 检查命名规范
  - 检查注释
  - 检查代码重复

### 6.5 浏览器兼容性测试

- [ ] Chrome 浏览器测试
  - 测试所有功能
  - 验证 UI 显示

- [ ] Edge 浏览器测试
  - 测试所有功能
  - 验证 UI 显示

- [ ] Firefox 浏览器测试（如果支持）
  - 测试所有功能
  - 验证 UI 显示

---

## 阶段七：文档和发布准备

### 7.1 文档完善

- [ ] 更新 README.md
  - 添加功能介绍
  - 添加安装说明
  - 添加使用说明
  - 添加开发指南
  - 添加截图

- [ ] 创建 CHANGELOG.md
  - 记录版本变更

- [ ] 创建 LICENSE
  - 选择合适的开源协议

- [ ] 创建用户指南（可选）
  - 详细使用说明
  - 常见问题解答

### 7.2 发布准备

- [ ] 准备宣传材料
  - 插件截图
  - 功能演示视频（可选）
  - 插件描述文案

- [ ] 创建 Chrome Web Store 账号
  - 准备开发者账号
  - 支付开发者费用

- [ ] 构建生产版本
  ```bash
  pnpm build
  pnpm package
  ```

- [ ] 测试生产构建
  - 加载打包后的插件
  - 完整功能测试

- [ ] 提交到 Chrome Web Store
  - 填写插件信息
  - 上传截图
  - 提交审核

### 7.3 后续优化（可选）

- [ ] 添加用户反馈收集
- [ ] 添加使用统计（匿名）
- [ ] 添加自动更新提示
- [ ] 添加更多下载格式支持
- [ ] 支持更多公众号平台
- [ ] 添加图片编辑功能
- [ ] 添加图片搜索功能
- [ ] 支持视频下载

---

## 任务完成检查清单

### 必须完成的核心功能
- [ ] 页面检测和错误提示
- [ ] 文章信息提取
- [ ] 图片提取（包括 data-src 处理）
- [ ] 侧边栏 UI 完整实现
- [ ] 图片选择功能
- [ ] 单张/批量下载
- [ ] ZIP 打包下载
- [ ] 中英文切换
- [ ] 设置页面基本功能

### 建议完成的功能
- [ ] 下载进度显示
- [ ] 图片懒加载
- [ ] 完整的错误处理
- [ ] 所有动画效果
- [ ] 响应式设计

### 可选的优化功能
- [ ] 下载历史记录
- [ ] 自定义下载设置
- [ ] 图片预览放大
- [ ] 批量重命名

---

## 预估工时

| 阶段 | 任务数 | 预估时间 |
|------|--------|----------|
| 阶段一：环境配置和依赖安装 | 10 | 2-3 小时 |
| 阶段二：基础架构搭建 | 15 | 4-5 小时 |
| 阶段三：核心功能开发 | 12 | 6-8 小时 |
| 阶段四：UI 组件开发 | 14 | 8-10 小时 |
| 阶段五：国际化和配置 | 9 | 3-4 小时 |
| 阶段六：测试和优化 | 21 | 6-8 小时 |
| 阶段七：文档和发布准备 | 10 | 3-4 小时 |
| **总计** | **91** | **32-42 小时** |

---

## 开发建议

1. **按阶段顺序开发**：每个阶段依赖前一个阶段的成果
2. **及时测试**：每完成一个模块就进行测试
3. **版本控制**：每完成一个功能提交一次 Git
4. **代码审查**：定期检查代码质量
5. **文档同步**：边开发边更新文档

---

## 问题跟踪

开发过程中遇到的问题可以记录在这里：

- [ ] 问题 1：（描述）
- [ ] 问题 2：（描述）

---

**最后更新时间：** 2025-01-17

**版本：** v1.0
