import { defineAction } from 'astro:actions';
import { getCollection } from 'astro:content';
import { z } from 'astro:schema';
import Fuse from 'fuse.js'

export const server = {
  search: defineAction({
    input: z.object({
      q: z.string(),
    }),
    handler: async({ q }) => {
        console.log(q)
        const list = (await getCollection('beers')).map(beer => beer.data)
        const fuseOptions = {
            keys: ['name', 'brewery.name'],
            threshold: 0.3,
        }
        const fuse = new Fuse(list, fuseOptions)
        const results = fuse.search(q)
        return results.map(result => result.item);
    }
  })
}