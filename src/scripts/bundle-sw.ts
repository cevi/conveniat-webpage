import { injectManifest } from '@serwist/build';
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

async function buildSW(): Promise<void> {
  const swSource = path.join(process.cwd(), 'src/features/service-worker/index.ts');
  const swTemporary = path.join(process.cwd(), 'public/sw.tmp.js');
  const swDestination = path.join(process.cwd(), 'public/sw.js');

  console.log('📦 Bundling Service Worker...');

  try {
    // 1. Bundle the Service Worker using esbuild to a temporary file
    await esbuild.build({
      entryPoints: [swSource],
      bundle: true,
      outfile: swTemporary,
      platform: 'browser',
      minify: false,
      sourcemap: false,
      define: {
        // eslint-disable-next-line n/no-process-env, @typescript-eslint/no-unnecessary-condition
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      },
      tsconfig: path.join(process.cwd(), 'tsconfig.json'),
    });

    const content = fs.readFileSync(swTemporary, 'utf8');
    const injectionPoint = 'self.__SW_MANIFEST';
    if (content.includes(injectionPoint)) {
      console.log(`✅ Found injection point: ${injectionPoint}`);
    } else {
      console.error(`❌ COULD NOT FIND injection point: ${injectionPoint}`);
      // Log a snippet to see what happened
      const index = content.indexOf('__SW_MANIFEST');
      if (index === -1) {
        console.log('Injection point totally missing.');
      } else {
        console.log('Context:', content.slice(index - 50, index + 50));
      }
    }

    console.log('💉 Injecting Precache Manifest...');

    // 2. Inject the manifest from the temporary file to the destination
    const { count, size } = await injectManifest({
      swSrc: swTemporary,
      swDest: swDestination,
      globDirectory: '.next',
      globPatterns: [
        'static/chunks/**/*.js',
        'static/css/**/*.css',
        'static/media/**/*.{woff2,ttf,otf}',
      ],
      globIgnores: ['static/chunks/webpack-*.js', '**/*.map'],
      modifyURLPrefix: {
        'static/': '/_next/static/',
      },
      injectionPoint: injectionPoint,
    });

    console.log(
      `✅ Service Worker bundled and injected: ${count} entries, ${Math.round(size / 1024)} KiB`,
    );

    // Cleanup
    if (fs.existsSync(swTemporary)) fs.unlinkSync(swTemporary);
  } catch (error) {
    console.error('❌ Failed to build Service Worker:', error);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }
}

await buildSW();
