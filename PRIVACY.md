# Privacy Policy for PickPic

**Last Updated: 2025-10-19**

## Introduction

PickPic ("we", "our", or "the extension") is committed to protecting your privacy. This privacy policy explains how our browser extension handles data when you use it.

## Our Privacy Commitment

**PickPic does not collect, store, transmit, or share any of your personal data.**

All processing happens entirely within your browser on your local device. We have designed this extension with privacy as a core principle.

## Data Collection

### What We DO NOT Collect

- Personal information (name, email, phone number, etc.)
- Browsing history
- Website content you visit
- Images or videos you download
- User behavior analytics
- Usage statistics
- IP addresses
- Device information
- Cookies or tracking identifiers

### What Data is Processed Locally

The extension processes the following data **only on your local device**:

1. **User Preferences**: Your language selection and settings are stored locally in your browser using the Chrome Storage API. This data never leaves your device.

2. **Page Content**: When you activate the extension on a webpage, it scans the current page for images and videos. This analysis happens entirely in your browser's memory and is not stored or transmitted anywhere.

3. **Downloads**: When you download images or videos, they are saved directly to your computer's download folder. We do not track or record what you download.

## Permissions Explained

The extension requests the following permissions, and here's exactly why:

### `activeTab`
- **Purpose**: Access the content of the webpage you're currently viewing
- **Usage**: Extract images and videos from the current page
- **Privacy**: Only activates when you click the extension icon; does not access tabs you haven't explicitly opened the extension on

### `storage`
- **Purpose**: Save your preferences locally in your browser
- **Usage**: Store your language preference and other settings
- **Privacy**: Data is stored only on your device and is never synchronized or transmitted

### `downloads`
- **Purpose**: Save images and videos to your computer
- **Usage**: Download individual images/videos or ZIP archives when you click download buttons
- **Privacy**: Standard browser download API; files are saved directly to your download folder

### `sidePanel`
- **Purpose**: Display the extension's user interface in the browser side panel
- **Usage**: Show the list of images and videos extracted from the current page
- **Privacy**: UI rendering only; no data collection

### `contextMenus`
- **Purpose**: Add a quick download option in the right-click menu when you click on images
- **Usage**: Allows you to right-click on any image and select "Download this image" for instant download without opening the side panel
- **Privacy**: Only creates a menu item; does not track your interactions or collect any data about what you download

### `<all_urls>`
- **Purpose**: Allow the extension to work on any website you choose to use it on
- **Usage**: Extract media content from any webpage when you activate the extension
- **Privacy**: The extension only activates when you click its icon; it does not run automatically on all websites

## Third-Party Services

PickPic **does not use any third-party services**, including:
- No analytics platforms (Google Analytics, etc.)
- No crash reporting services
- No advertising networks
- No social media integrations
- No external APIs or servers

## Data Storage

All data storage is local to your browser:

- **Browser Storage**: User preferences are stored using the Chrome Storage API (`chrome.storage.local`)
- **No Cloud Storage**: We do not use any cloud storage or remote servers
- **No Databases**: We do not maintain any databases of user information

## Data Sharing

We do **NOT** share any data because we do not collect any data in the first place.

- No data is sold to third parties
- No data is shared with advertisers
- No data is transmitted to our servers (we don't have any servers)
- No data is shared with analytics platforms

## Children's Privacy

Our extension does not knowingly collect any information from anyone, including children under the age of 13. Since we don't collect any data at all, our extension is safe for users of all ages.

## Security

While we do not collect data, we still take security seriously:

- All processing happens locally in your browser's secure sandbox
- We use standard browser APIs with appropriate permissions
- We do not inject any tracking code into websites
- The extension source code can be reviewed for transparency

## Your Rights

Because we don't collect any personal data, there is no data to:
- Access
- Modify
- Delete
- Export
- Request

Your data stays on your device and under your control at all times.

## Open Source

PickPic is open source software. You can review the complete source code to verify our privacy claims:

**GitHub Repository**: [https://github.com/yourusername/pickpic](https://github.com/yourusername/pickpic)

We encourage security researchers and privacy advocates to audit our code.

## Changes to This Privacy Policy

If we ever change how we handle data (though we have no plans to), we will:
1. Update this privacy policy
2. Change the "Last Updated" date at the top
3. Notify users through the extension's update notes

Significant changes to data collection practices would require a new version of the extension and explicit user consent.

## Contact Information

If you have questions or concerns about privacy:

- **GitHub Issues**: [https://github.com/yourusername/pickpic/issues](https://github.com/yourusername/pickpic/issues)
- **Email**: dev@yaolifeng.com
- **Author**: Immerse ([@yaolifeng0629](https://github.com/yaolifeng0629))

## Compliance

This extension complies with:
- **GDPR** (General Data Protection Regulation): No personal data is collected or processed
- **CCPA** (California Consumer Privacy Act): No personal information is sold or shared
- **Chrome Web Store Policies**: Follows all Chrome extension development best practices
- **Browser Extension Privacy Guidelines**: Adheres to recommended privacy standards

## Summary

**TL;DR**: PickPic is a privacy-focused browser extension that:
- ✅ Works entirely offline and locally in your browser
- ✅ Does not collect any personal data
- ✅ Does not track your browsing
- ✅ Does not communicate with any external servers
- ✅ Stores preferences only on your local device
- ✅ Is open source and auditable

Your privacy is our priority. If you have any questions, please don't hesitate to reach out.

---

**License**: This privacy policy is provided under the same MIT License as the PickPic extension.
