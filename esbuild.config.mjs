import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const baseConfig = {
  bundle: true,
  minify: false,
  sourcemap: false,
};

async function build() {
  // Extension bundle (runs in Node.js, vscode is external)
  const extCtx = await esbuild.context({
    ...baseConfig,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
  });

  // Webview bundle (runs in browser)
  const webCtx = await esbuild.context({
    ...baseConfig,
    entryPoints: ['webview/main.ts'],
    outfile: 'dist/webview.js',
    platform: 'browser',
    format: 'iife',
  });

  if (watch) {
    await extCtx.watch();
    await webCtx.watch();
    console.log('Watching for changes…');
  } else {
    await extCtx.rebuild();
    await webCtx.rebuild();
    await extCtx.dispose();
    await webCtx.dispose();
    console.log('Build complete.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
