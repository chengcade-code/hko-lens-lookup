import {build} from 'esbuild';
await build({entryPoints:[new URL('./src/main.ts',import.meta.url).pathname],bundle:true,minify:true,format:'iife',target:'es2020',charset:'ascii',outfile:new URL('./runtime.js',import.meta.url).pathname});
