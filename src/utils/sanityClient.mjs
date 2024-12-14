import {createClient} from '@sanity/client'


const client = createClient({
  projectId: '75ecmzpn',
  dataset: 'production',
  apiVersion: '2023-05-03', 
  token: 'skT5EaawErqgMJMOVUnPQ0HFhQBNRyWilCjQUt74gEUQsYZsgKSVXWFYqCTDl6O1l5Y8U72Lesa0AUaNBgXxrQmQxALi15hnHHHuIKOc5MKRKHpSX988GXXHkXZYqXzERFZJSSOYrYaMEfZ5zmjfJuq7grRDSRLWvgS4hywgUIGbjtNKaOj6', // we need this to get write access
  useCdn: false // We can't use the CDN for writing
})

export default client;