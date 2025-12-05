<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1FE58jyddcyHSRn3lYm_FP8HehflFvRhR

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

### 自动部署（推荐）

1. 确保你的仓库已启用 GitHub Pages：
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"

2. 推送代码到 main/master 分支，GitHub Actions 会自动构建并部署

3. 如果仓库名不是 `minna-learning---peppa-style`，需要修改 `vite.config.ts` 中的 base 路径：
   ```typescript
   const base = process.env.GITHUB_PAGES_BASE || '/你的仓库名/';
   ```

### 手动部署

1. 构建项目：
   ```bash
   npm run build
   ```

2. 如果仓库名不是 `minna-learning---peppa-style`，构建时设置环境变量：
   ```bash
   GITHUB_PAGES_BASE=/你的仓库名/ npm run build
   ```

3. 将 `dist` 目录的内容推送到 `gh-pages` 分支，或使用 GitHub Pages 设置指向 `dist` 目录

### 移动端访问

部署后，可以通过以下方式在苹果手机浏览器访问：
- 打开 Safari 浏览器
- 访问：`https://你的用户名.github.io/仓库名/`
- 建议添加到主屏幕以获得更好的体验
