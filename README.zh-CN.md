<div align="center">
   <img src="./PickPic/assets/icon.png" alt="PickPic Logo" width="160" height="160" />
</div>

<h1 align="center">PickPic</h1>

<p align="center">通用的浏览器扩展,可从任何网页下载图片和视频,并为微信公众号文章提供增强支持。</p>

<div align="center">

**[English](./README.md)** | \***\*[中文文档](./README.zh-CN.md)**

</div>

## 支持的平台

-   [x] 微信公众号文章(WeChat Official Accounts)
-   [x] 掘金(Juejin)
-   [x] 知乎(Zhihu)
-   [x] InfoQ
-   [x] 简书(Jianshu)
-   [x] 阿里云(Aliyun)
-   [x] 腾讯云(Tencent Cloud)
-   [x] CSDN
-   [x] 博客园(Cnblogs)
-   [x] 51CTO
-   [x] 新浪微博(Sina Weibo)
-   [x] 豆瓣(Douban)
-   [x] 哔哩哔哩(Bilibili)
-   [x] 微博(Weibo)
-   [x] 思否(SegmentFault)
-   [x] 今日头条(Toutiao)
-   [x] 其他 Web 网页(Other Web Pages)

## 功能特性

-   **通用支持**:适用于任何网页,提取图片和视频
-   **微信增强支持**:为微信公众号文章提供特殊功能
    -   文章详情查看(标题、作者、描述)
    -   优化的文章正文内容提取
    -   智能过滤文章图片(排除头像、二维码等)
-   **图片预览**:双击任意图片在新标签页预览
-   **灵活下载**:
    -   选择并下载单个或全部内容
    -   单张图片直接下载
    -   多个内容自动打包为 ZIP 压缩包
-   **媒体支持**:同时支持图片和视频
-   **双语界面**:中文和英文(中文/English)
-   **侧边栏界面**:无需打断浏览即可快速访问
-   **响应式设计**:针对不同屏幕尺寸优化

## 安装

### 从源代码安装(开发环境)

1. **前置要求**:

    - 已安装 Node.js 16+ 和 pnpm
    - Git

2. **克隆仓库**:

    ```bash
    git clone https://github.com/yourusername/pickpic.git
    cd pickpic
    ```

3. **安装依赖**:

    ```bash
    pnpm install
    ```

4. **启动开发服务器**:

    ```bash
    pnpm dev
    ```

5. **在 Chrome 中加载扩展**:
    - 打开 `chrome://extensions/`
    - 启用"开发者模式"(右上角开关)
    - 点击"加载已解压的扩展程序"
    - 选择 `build/chrome-mv3-dev` 目录

### 生产构建

创建用于分发的生产版本:

```bash
pnpm build
```

生产版本将在 `build/chrome-mv3-prod` 目录中生成。

将扩展打包为 ZIP 文件:

```bash
pnpm package
```

## 使用方法

1. **访问任何网页**(支持所有网站)
2. **打开扩展**:点击浏览器工具栏中的 PickPic 图标
3. **查看提取的内容**:页面中的所有图片和视频将被显示
4. **对于微信文章**:点击 "Detail" 按钮(ℹ️)查看文章元数据
5. **选择内容**:点击图片/视频进行选择(支持多选)
6. **预览图片**:双击任意图片在新标签页中打开
7. **下载**:
    - **下载选中**:单个内容直接下载,多个内容打包为 ZIP
    - **下载全部**:始终创建包含所有内容的 ZIP 压缩包
8. **刷新**:点击刷新按钮重新扫描页面以获取新内容

## 权限说明

此扩展需要以下权限:

-   **`activeTab`**:访问当前网页以提取图片和视频
-   **`storage`**:保存您的偏好设置(语言、设置)
-   **`downloads`**:将图片、视频和 ZIP 文件下载到您的计算机
-   **`sidePanel`**:在浏览器侧边栏中显示扩展界面
-   **`<all_urls>`**:在您访问的任何网站上工作(仅在您点击扩展图标时提取媒体)

**隐私保护**:此扩展不会收集、存储或传输任何个人数据。所有处理都在您的浏览器本地完成。详见我们的[隐私政策](./PRIVACY.md)。

## 技术栈

-   **框架**: [Plasmo](https://www.plasmo.com/) - 浏览器扩展开发框架
-   **UI 库**: React 18
-   **开发语言**: TypeScript
-   **样式框架**: Tailwind CSS
-   **状态管理**: Zustand
-   **国际化**: i18next
-   **压缩包生成**: JSZip
-   **构建工具**: pnpm

## 开发命令

-   `pnpm dev`:启动带热重载的开发服务器
-   `pnpm build`:创建生产构建
-   `pnpm package`:将扩展打包为 ZIP 用于分发
-   `pnpm clean`:清理构建产物

## 项目结构

```
wechat-pic/
├── background.ts          # 后台服务工作进程
├── sidepanel.tsx         # 主侧边栏界面
├── contents/             # 内容脚本
│   └── extractor.ts      # 媒体提取逻辑
├── components/           # React 组件
│   ├── sidepanel/       # 侧边栏组件
│   └── settings/        # 设置页面组件
├── hooks/               # 自定义 React hooks
├── lib/                 # 工具函数
├── store/              # Zustand 状态存储
├── types/              # TypeScript 类型定义
├── locales/            # i18n 翻译文件
└── styles/             # 全局样式
```

## 贡献

欢迎贡献!请随时提交 Pull Request。

1. Fork 本仓库
2. 创建您的功能分支(`git checkout -b feature/AmazingFeature`)
3. 提交您的更改(`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支(`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 作者

[**Immerse**](https://yaolifeng.com)

-   GitHub: [@yaolifeng0629](https://github.com/yaolifeng0629)
-   邮箱: dev@yaolifeng.com
