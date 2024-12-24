import {createClient} from '@sanity/client'


const client = createClient({
  projectId: '75ecmzpn',
  dataset: 'production',
  apiVersion: '2023-05-03', 
  token: import.meta.env.SANITY_TOKEN,
  useCdn: false // We can't use the CDN for writing
})

export default client;