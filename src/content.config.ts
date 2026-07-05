import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kind: z.string(),
    image: z.string().optional(),
    imagePosition: z.string().optional(),
    lead: z.string(),
    body: z.string(),
    // Irish translations. Required going forward in the Keystatic editor
    // (see keystatic.config.ts) but optional here in the Zod schema — older
    // articles saved before this field existed must not fail the build.
    // The Gaeilge homepage/news pages fall back to the English copy for any
    // article that hasn't been translated yet.
    titleGa: z.string().optional(),
    kindGa: z.string().optional(),
    leadGa: z.string().optional(),
    bodyGa: z.string().optional(),
  }),
});

export const collections = { news };
