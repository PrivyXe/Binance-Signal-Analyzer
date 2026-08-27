import { build } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

async function runBuild() {
  console.log('🚀 Starting Chrome Extension Manifest V3 Build...');

  // Ensure clean dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Build Popup & Options HTML
  console.log('📦 [1/3] Building Popup & Options HTML...');
  await build({
    root: rootDir,
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'esnext',
      rollupOptions: {
        input: {
          popup: resolve(rootDir, 'popup.html'),
          options: resolve(rootDir, 'options.html')
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    }
  });

  // 2. Build Background Service Worker (ES format)
  console.log('⚙️ [2/3] Building Background Service Worker...');
  await build({
    root: rootDir,
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'esnext',
      lib: {
        entry: resolve(rootDir, 'src/background/background.ts'),
        formats: ['es'],
        fileName: () => 'background.js'
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    }
  });

  // 3. Build Content Script (IIFE standalone format)
  console.log('🎨 [3/3] Building Content Script & Styles...');
  await build({
    root: rootDir,
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'esnext',
      lib: {
        entry: resolve(rootDir, 'src/content/index.ts'),
        name: 'BinanceSignalAnalyzerContent',
        formats: ['iife'],
        fileName: () => 'content.js'
      },
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'styles.css';
            }
            return 'assets/[name]-[hash].[ext]';
          }
        }
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    }
  });

  // 4. Copy manifest.json & icons
  console.log('📋 Copying manifest.json and icons to dist...');
  fs.copyFileSync(
    resolve(rootDir, 'public/manifest.json'),
    resolve(distDir, 'manifest.json')
  );

  const iconsSrcDir = resolve(rootDir, 'public/icons');
  const iconsDestDir = resolve(distDir, 'icons');
  if (!fs.existsSync(iconsDestDir)) {
    fs.mkdirSync(iconsDestDir, { recursive: true });
  }

  const iconFiles = fs.readdirSync(iconsSrcDir);
  for (const icon of iconFiles) {
    fs.copyFileSync(
      resolve(iconsSrcDir, icon),
      resolve(iconsDestDir, icon)
    );
  }

  console.log('✨ Build completed successfully! Extension is ready in dist/');
}

runBuild().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
