import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: process.env.NODE_ENV === 'production'
    ? { kind: 'cloud' }
    : { kind: 'local' },
  cloud: { project: 'news-donegal-airport/donegal-airport' },

  ui: {
    brand: { name: 'Donegal Airport · CFN' },
  },

  collections: {
    news: collection({
      label: 'News',
      slugField: 'title',
      path: 'src/content/news/*',
      // Shown as sortable columns in the News list — click a column header
      // to sort by Date or by Title (name).
      columns: ['title', 'date', 'kind'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({
          label: 'Date',
          validation: { isRequired: true },
        }),
        kind: fields.text({
          label: 'Category',
          description: 'e.g. Operations, Sustainability, Community, Awards…',
          validation: { isRequired: true },
        }),
        image: fields.image({
          label: 'Hero image',
          description: 'Upload a photo for the article hero.',
          directory: 'public/photos',
          publicPath: '/photos/',
          validation: { isRequired: false },
        }),
        imagePosition: fields.text({
          label: 'Image position',
          description: 'How the photo is framed (e.g. "30% 70%"). Use the picker at /tools/image-position — paste the photo\'s path, pick "News hero", drag to frame it, then copy the value here. Default: 50% 50%.',
          defaultValue: '50% 50%',
          validation: { isRequired: false },
        }),
        lead: fields.text({
          label: 'Opening line',
          description: 'One strong sentence shown large at the top of the article.',
          validation: { isRequired: true },
        }),
        body: fields.text({
          label: 'Body',
          description: 'Full article text. Separate paragraphs with a blank line.',
          multiline: true,
          validation: { isRequired: true },
        }),
        // Irish translations — required for every new article so the
        // Gaeilge site is never left showing untranslated English news.
        // (Existing articles saved before this was added will prompt for
        // these the next time they're opened and saved.)
        titleGa: fields.text({
          label: 'Title (Gaeilge)',
          description: 'Irish translation of the title above.',
          validation: { isRequired: true },
        }),
        kindGa: fields.text({
          label: 'Category (Gaeilge)',
          description: 'Irish translation of the category above.',
          validation: { isRequired: true },
        }),
        leadGa: fields.text({
          label: 'Opening line (Gaeilge)',
          description: 'Irish translation of the opening line above.',
          validation: { isRequired: true },
        }),
        bodyGa: fields.text({
          label: 'Body (Gaeilge)',
          description: 'Irish translation of the full article text. Separate paragraphs with a blank line.',
          multiline: true,
          validation: { isRequired: true },
        }),
      },
    }),
  },
});
