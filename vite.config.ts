import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // GitHub Pages base path - change this to your repository name if different
    const base = process.env.GITHUB_PAGES_BASE || '/jp-match/';
    
    return {
      base: base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // 移除构建后的importmap，因为依赖已经打包
        {
          name: 'remove-importmap',
          transformIndexHtml(html) {
            if (mode === 'production') {
              // 移除importmap脚本
              return html.replace(/<script type="importmap">[\s\S]*?<\/script>/g, '');
            }
            return html;
          },
        },
      ],
      define: {
        // 终极修复：在浏览器环境中 polyfill process.env，防止第三方库崩溃
        'process.env': {},
        'process.env.NODE_ENV': JSON.stringify(mode),
        'global': 'window',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            manualChunks: undefined,
          },
        },
      }
    };
});
