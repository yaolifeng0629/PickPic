# PickPic

A universal browser extension for downloading images and videos from any webpage, with enhanced support for WeChat Official Account articles.

**[中文文档](./README.zh-CN.md)** | **[Privacy Policy](./PRIVACY.md)**

## Supported Platforms

- [x] WeChat Official Account Articles
- [x] Juejin
- [x] Zhihu
- [x] Jianshu
- [x] CSDN
- [x] Cnblogs
- [x] 51CTO
- [x] Sina Weibo
- [x] Douban
- [x] Bilibili
- [x] Weibo
- [x] Tieba
- [x] SegmentFault
- [x] Zhihu Column
- [x] Various forums and blogs
- [x] Any other webpages

## Features

- **Universal Support**: Works on any webpage to extract images and videos
- **Enhanced WeChat Support**: Special features for WeChat Official Account articles
  - Article details view (title, author, description)
  - Optimized content extraction from article body
  - Smart filtering of article images (excludes profile images, QR codes, etc.)
- **Image Preview**: Double-click any image to preview in new tab
- **Flexible Downloads**:
  - Select and download individual items or all at once
  - Single image downloads directly
  - Multiple items automatically packaged as ZIP archive
- **Media Support**: Both images and videos
- **Bilingual Interface**: English and Chinese (中文/English)
- **Side Panel UI**: Easy access without disrupting your browsing
- **Responsive Design**: Optimized for different screen sizes

## Installation

### From Source (Development)

1. **Prerequisites**:
   - Node.js 16+ and pnpm installed
   - Git

2. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/pickpic.git
   cd pickpic
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Start development server**:
   ```bash
   pnpm dev
   ```

5. **Load extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select `build/chrome-mv3-dev` directory

### Production Build

To create a production build for distribution:

```bash
pnpm build
```

The production bundle will be created in the `build/chrome-mv3-prod` directory.

To package the extension into a ZIP file:

```bash
pnpm package
```

## Usage

1. **Navigate to any webpage** (works on all websites)
2. **Open the extension**: Click the PickPic icon in your browser toolbar
3. **View extracted content**: All images and videos from the page are displayed
4. **For WeChat articles**: Click the "Detail" button (ℹ️) to view article metadata
5. **Select items**: Click on images/videos to select them (multi-select supported)
6. **Preview images**: Double-click any image to open it in a new tab
7. **Download**:
   - **Download Selected**: Single item downloads directly, multiple items as ZIP
   - **Download All**: Always creates a ZIP archive with all content
8. **Refresh**: Click the refresh button to re-scan the page for new content

## Permissions Explained

This extension requires the following permissions:

- **`activeTab`**: Access the current webpage to extract images and videos
- **`storage`**: Save your preferences (language, settings)
- **`downloads`**: Download images, videos, and ZIP files to your computer
- **`sidePanel`**: Display the extension interface in the browser side panel
- **`<all_urls>`**: Work on any website you visit (we only extract media when you click the extension icon)

**Privacy**: This extension does not collect, store, or transmit any personal data. All processing happens locally in your browser. See our [Privacy Policy](./PRIVACY.md) for details.

## Tech Stack

- **Framework**: [Plasmo](https://www.plasmo.com/) - The browser extension framework
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Internationalization**: i18next
- **Archive Creation**: JSZip
- **Build Tool**: pnpm

## Development Commands

- `pnpm dev`: Start development server with hot reload
- `pnpm build`: Create production build
- `pnpm package`: Package extension as ZIP for distribution
- `pnpm clean`: Clean build artifacts

## Project Structure

```
wechat-pic/
├── background.ts          # Background service worker
├── sidepanel.tsx         # Main side panel UI
├── contents/             # Content scripts
│   └── extractor.ts      # Media extraction logic
├── components/           # React components
│   ├── sidepanel/       # Side panel components
│   └── settings/        # Settings page components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── store/              # Zustand stores
├── types/              # TypeScript type definitions
├── locales/            # i18n translation files
└── styles/             # Global styles
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Author

[**Immerse**](https://yaolifeng.com)

- GitHub: [@yaolifeng0629](https://github.com/yaolifeng0629)
- Email: dev@yaolifeng.com

