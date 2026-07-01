// Override Keystatic's injected API route so we can pass localBaseDirectory.
// Without this, Keystatic falls back to process.cwd() which may point to the
// wrong directory when the dev server is launched from outside this project.
import { makeHandler } from '@keystatic/astro/api';
import config from 'virtual:keystatic-config';
import { fileURLToPath } from 'node:url';

// In dev (Vite SSR), import.meta.url points to this source file.
// Four levels up (keystatic/ → api/ → pages/ → src/) lands at the project root.
// In production, storage is 'cloud' so localBaseDirectory is never used.
const projectRoot = fileURLToPath(new URL('../../../../', import.meta.url));

export const all = makeHandler({ config, localBaseDirectory: projectRoot });
export const ALL = all;
export const prerender = false;
