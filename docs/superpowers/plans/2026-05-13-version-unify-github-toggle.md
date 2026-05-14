# Version Unify & GitHub Entry Toggle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify version to 2.0.0 and add a persistent toggle to show/hide GitHub entry links in Settings.

**Architecture:** A new Zustand store (`useSettingsStore`) persists `showGithubEntry` to `chrome.storage.sync`. The store is hydrated on app mount in `sidepanel.tsx`. A toggle component renders in `tabs/settings.tsx`, and `FeedbackTab`/`DonateTab` conditionally render GitHub sections based on the store value.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Plasmo, chrome.storage.sync API

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Bump root `version` to `2.0.0` |
| `store/settings-store.ts` | Create | Zustand store with `showGithubEntry`, persistence to `chrome.storage.sync` |
| `components/settings/github-toggle.tsx` | Create | Labeled checkbox toggle for `showGithubEntry` |
| `tabs/settings.tsx` | Modify | Render `GithubToggle` above tab content |
| `sidepanel.tsx` | Modify | Call `useSettingsStore.getState().init()` on mount |
| `components/settings/feedback-tab.tsx` | Modify | Conditionally render GitHub Issues section |
| `components/settings/donate-tab.tsx` | Modify | Conditionally render "Star on GitHub" section |
| `locales/en/translation.json` | Modify | Add `showGithubEntry` and `showGithubEntryDesc` keys |
| `locales/zh-CN/translation.json` | Modify | Add Chinese translations for new keys |

---

## Chunk 1: Version Bump

### Task 1: Update package.json version

**Files:**
- Modify: `package.json:4`

- [ ] **Step 1: Edit version field**

  Change line 4 from `"version": "0.0.1"` to `"version": "2.0.0"`.

  ```json
  {
    "name": "PickPic",
    "displayName": "PickPic: One-click downloader for images and videos from any webpage",
    "version": "2.0.0",
  ```

- [ ] **Step 2: Verify**

  Run: `node -p "require('./package.json').version"`
  Expected output:
  ```
  2.0.0
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add package.json
  git commit -m "chore: unify version to 2.0.0"
  ```

---

## Chunk 2: Settings Store

### Task 2: Create useSettingsStore

**Files:**
- Create: `store/settings-store.ts`

- [ ] **Step 1: Create the store file**

  ```typescript
  import { create } from 'zustand'

  interface SettingsState {
    showGithubEntry: boolean
    _hydrated: boolean
    setShowGithubEntry: (v: boolean) => Promise<void>
    init: () => Promise<void>
  }

  const STORAGE_KEY = 'settings'
  const DEFAULT_SETTINGS = { showGithubEntry: true }

  export const useSettingsStore = create<SettingsState>((set, get) => ({
    showGithubEntry: DEFAULT_SETTINGS.showGithubEntry,
    _hydrated: false,

    setShowGithubEntry: async (showGithubEntry) => {
      const previous = get().showGithubEntry
      set({ showGithubEntry })

      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
          await chrome.storage.sync.set({ [STORAGE_KEY]: { showGithubEntry } })
        }
      } catch {
        // Revert on failure to keep UI and storage consistent
        set({ showGithubEntry: previous })
      }
    },

    init: async () => {
      if (get()._hydrated) return

      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
          const result = await chrome.storage.sync.get(STORAGE_KEY)
          const stored = result[STORAGE_KEY]
          if (stored && typeof stored.showGithubEntry === 'boolean') {
            set({ showGithubEntry: stored.showGithubEntry, _hydrated: true })
            return
          }
        }
      } catch {
        // Silent fallback to defaults
      }

      set({ _hydrated: true })
    },
  }))
  ```

- [ ] **Step 2: Verify project builds**

  Run: `pnpm build`
  Expected: Clean build with no TypeScript errors

- [ ] **Step 3: Commit**

  ```bash
  git add store/settings-store.ts
  git commit -m "feat: add useSettingsStore with chrome.storage.sync persistence"
  ```

---

## Chunk 3: i18n Keys

### Task 3: Add English translations

**Files:**
- Modify: `locales/en/translation.json`

- [ ] **Step 1: Add keys after line 89**

  Insert after the `"shareText"` entry (around line 89):

  ```json
    "showGithubEntry": "Show GitHub links",
    "showGithubEntryDesc": "Display GitHub issue and star links in settings",
  ```

  Ensure the JSON remains valid (watch for trailing commas).

- [ ] **Step 2: Commit**

  ```bash
  git add locales/en/translation.json
  git commit -m "feat(i18n): add showGithubEntry keys in English"
  ```

### Task 4: Add Chinese translations

**Files:**
- Modify: `locales/zh-CN/translation.json`

- [ ] **Step 1: Add keys after line 89**

  Insert after the `"shareText"` entry (around line 89):

  ```json
    "showGithubEntry": "显示 GitHub 链接",
    "showGithubEntryDesc": "在设置中显示 GitHub Issue 和加星链接",
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add locales/zh-CN/translation.json
  git commit -m "feat(i18n): add showGithubEntry keys in Chinese"
  ```

---

## Chunk 4: UI Components

### Task 5: Create GithubToggle component

**Files:**
- Create: `components/settings/github-toggle.tsx`

- [ ] **Step 1: Create the component**

  ```typescript
  import { useSettingsStore } from "~store/settings-store"
  import { useTranslation } from "react-i18next"

  export function GithubToggle() {
    const { t } = useTranslation()
    const { showGithubEntry, setShowGithubEntry } = useSettingsStore()

    return (
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            {t('settings.showGithubEntry')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('settings.showGithubEntryDesc')}
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={showGithubEntry}
            onChange={(e) => setShowGithubEntry(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
        </label>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add components/settings/github-toggle.tsx
  git commit -m "feat: add GithubToggle component"
  ```

### Task 6: Modify FeedbackTab for conditional rendering

**Files:**
- Modify: `components/settings/feedback-tab.tsx`

- [ ] **Step 1: Verify current DOM structure**

  Read `components/settings/feedback-tab.tsx` and confirm the GitHub Issues section is wrapped in `<div className="bg-gray-50 rounded-lg p-6">` containing `{t('settings.githubIssues')}`. If the structure differs, adjust the conditional block accordingly.

- [ ] **Step 2: Add store import and conditional wrapper**

  Add import at the top (after line 2):
  ```typescript
  import { useSettingsStore } from "~store/settings-store"
  ```

  Add store read inside the component (after line 5):
  ```typescript
    const { showGithubEntry } = useSettingsStore()
  ```

  Wrap the GitHub Issues section (lines 13-27) with a conditional:
  ```tsx
            {showGithubEntry && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('settings.githubIssues')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('settings.githubText')}
                </p>
                <a
                  href="https://github.com/yaolifeng0629/PickPic/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  {t('settings.openIssue')}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add components/settings/feedback-tab.tsx
  git commit -m "feat: conditionally render GitHub Issues section"
  ```

### Task 7: Modify DonateTab for conditional rendering

**Files:**
- Modify: `components/settings/donate-tab.tsx`

- [ ] **Step 1: Verify current DOM structure**

  Read `components/settings/donate-tab.tsx` and confirm the "Star on GitHub" section is the first `<div className="bg-white rounded-lg p-4 border border-gray-200">` containing `{t('settings.starGithub')}`. If the structure differs, adjust the conditional block accordingly.

- [ ] **Step 2: Add store import and conditional wrapper**

  Add import at the top (after line 1):
  ```typescript
  import { useSettingsStore } from "~store/settings-store"
  ```

  Add store read inside the component (after line 4):
  ```typescript
    const { showGithubEntry } = useSettingsStore()
  ```

  Wrap the "Star on GitHub" section (lines 22-27) with a conditional:
  ```tsx
              {showGithubEntry && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-900 mb-2">{t('settings.starGithub')}</div>
                  <p className="text-sm text-gray-600">
                    {t('settings.starGithubText')}
                  </p>
                </div>
              )}
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add components/settings/donate-tab.tsx
  git commit -m "feat: conditionally render Star on GitHub section"
  ```

---

## Chunk 5: Integration

### Task 8: Modify Settings page to render toggle

**Files:**
- Modify: `tabs/settings.tsx`

- [ ] **Step 1: Add import**

  Add after existing imports:
  ```typescript
  import { GithubToggle } from "~components/settings/github-toggle"
  ```

- [ ] **Step 2: Render toggle**

  Insert the toggle inside the `<main>` element, before the tab conditional rendering:
  ```tsx
  <main className="flex-1">
    <GithubToggle />
    {activeTab === 'about' && <AboutTab />}
    {activeTab === 'privacy' && <PrivacyTab />}
    {activeTab === 'feedback' && <FeedbackTab />}
    {activeTab === 'donate' && <DonateTab />}
  </main>
  ```

  > Note: Store hydration happens in `sidepanel.tsx` (Task 9). Do NOT call `init()` here — the `_hydrated` flag already prevents duplicate work, but a single init source is cleaner.

- [ ] **Step 3: Commit**

  ```bash
  git add tabs/settings.tsx
  git commit -m "feat: add GithubToggle to settings page"
  ```

### Task 9: Modify SidePanel to hydrate store

**Files:**
- Modify: `sidepanel.tsx`

- [ ] **Step 1: Add store import and init call**

  Add import:
  ```typescript
  import { useSettingsStore } from "~store/settings-store"
  ```

  Add init call in `IndexSidePanel`:
  ```typescript
  function IndexSidePanel() {
    useArticleExtractor()
    const { isLoading } = useArticleStore()
    const { toasts, removeToast } = useToast()

    useEffect(() => {
      useSettingsStore.getState().init()
    }, [])

    // ... rest of component
  ```

  > Note: `init()` is fire-and-forget. It is async but we do not await it — the `_hydrated` flag and default values ensure the UI is never blocked.

- [ ] **Step 2: Commit**

  ```bash
  git add sidepanel.tsx
  git commit -m "feat: hydrate settings store on sidepanel mount"
  ```

---

## Chunk 6: Verification

### Task 10: Manual testing checklist

- [ ] **Step 1: Build the extension**

  Run: `pnpm build`
  Expected: Clean build with no TypeScript errors

- [ ] **Step 2: Verify version**

  Run: `node -p "require('./package.json').version"`
  Expected:
  ```
  2.0.0
  ```

- [ ] **Step 3: Load extension in Chrome and test**

  1. Open `chrome://extensions/`
  2. Enable Developer mode
  3. Click "Load unpacked" and select the `build/chrome-mv3-prod` directory
  4. Open the PickPic side panel on any webpage
  5. Navigate to Settings → Feedback tab
  6. Verify: GitHub Issues section is visible by default
  7. Toggle "Show GitHub links" off
  8. Verify: GitHub Issues section disappears from Feedback tab
  9. In `tabs/settings.tsx`, temporarily uncomment the Donate tab menu item (`// { id: 'donate', label: t('settings.donate') }`) to make the tab visible
  10. Switch to Donate tab and verify: "Star on GitHub" section is hidden
  11. **Cleanup:** re-comment the Donate tab menu item to restore original behavior
  12. Close the side panel
  13. Reopen the side panel
  14. Navigate back to Settings → Feedback
  15. Verify: GitHub Issues section is still hidden (persistence works)
  16. Toggle back on
  17. Verify: sections reappear

- [ ] **Step 4: Final commit**

  ```bash
  git commit --allow-empty -m "feat: complete version unify and github toggle implementation"
  ```
