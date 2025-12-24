import { injectManifest } from '@serwist/build';
import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';

async function buildSW() {
    const swSrc = path.join(process.cwd(), 'src/features/service-worker/index.ts');
    const swTmp = path.join(process.cwd(), 'public/sw.tmp.js');
    const swDest = path.join(process.cwd(), 'public/sw.js');

    console.log('📦 Bundling Service Worker...');

    try {
        // 1. Bundle the Service Worker using esbuild to a temporary file
        await esbuild.build({
            entryPoints: [swSrc],
            bundle: true,
            outfile: swTmp,
            platform: 'browser',
            minify: false,
            sourcemap: false,
            define: {
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
            },
            tsconfig: path.join(process.cwd(), 'tsconfig.json'),
        });

        const content = fs.readFileSync(swTmp, 'utf8');
        const injectionPoint = 'self.__SW_MANIFEST';
        if (content.includes(injectionPoint)) {
            console.log(`✅ Found injection point: ${injectionPoint}`);
        } else {
            console.error(`❌ COULD NOT FIND injection point: ${injectionPoint}`);
            // Log a snippet to see what happened
            const index = content.indexOf('__SW_MANIFEST');
            if (index !== -1) {
                console.log('Context:', content.substring(index - 50, index + 50));
            } else {
                console.log('Injection point totally missing.');
            }
        }

        console.log('💉 Injecting Precache Manifest...');

        // 2. Inject the manifest from the temporary file to the destination
        const { count, size } = await injectManifest({
            swSrc: swTmp,
            swDest: swDest,
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

        console.log(`✅ Service Worker bundled and injected: ${count} entries, ${Math.round(size / 1024)} KiB`);

        // Cleanup
        if (fs.existsSync(swTmp)) fs.unlinkSync(swTmp);
    } catch (error) {
        console.error('❌ Failed to build Service Worker:', error);
        process.exit(1);
    }
}

buildSW();
