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
  }),
});

export const collections = { news };
