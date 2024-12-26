import { z, defineCollection, getCollection } from 'astro:content';
import client from './utils/sanityClient.mjs';
const beers = defineCollection({
    loader: async () => {
        const beers = await client.fetch(`
            *[_type == "beer"] {
              _id,
              name,
              brewery->{
                  _id,
                name,
                city,
                state,
                slug
              },
              abv,
              style,
              ibu,
              myScore,
              notTasted
            }
          `);

          return beers.map((beer) => ({
            id: beer._id,
            ...beer
          }))
    }
})

const breweries = defineCollection({
    loader: async () => {
        const breweries = await client.fetch(`
            *[_type == "brewery"] {
                _id,
                name,
                city,
                state,
                "beerCount": count(*[_type=="beer" && references(^._id)]),
                "avgRating": round(math::avg(*[_type=="beer" && references(^._id)]{myScore}[].myScore), 2),
                "beers": *[_type=="beer" && references(^._id)]{
                    name,
                    style,
                    myScore
                }
            }
           
          `);

          return breweries.map((brewery) => ({
            id: brewery._id,
            ...brewery
          }))
    }
})  

const beersByState = defineCollection({
    loader: async () => {
        const states= await client.fetch(`
            array::unique(*[_type == "brewery"]{state}["state"])
            `);
            const beers = await client.fetch(`
                *[_type == "beer"] {
                  _id,
                  name,
                  date,
                  brewery->{
                      _id,
                    name,
                    city,
                    state,
                    slug
                  },
                  abv,
                  style,
                  ibu,
                  myScore
                }
              `);
        

            const beersByState = states.map((state) => {

            const filteredBeers = beers.filter(beer => beer.brewery?.state === state);

            const avgRating = parseFloat((filteredBeers.reduce((acc, beer) => acc + beer.myScore, 0) / filteredBeers.length).toFixed(2));

            return {
            id: state || 'unknown',
            filteredBeers,
            avgRating

        }

    })

    return beersByState
        
    }
})

const checkins = defineCollection({
    loader: async () => {
        const checkins = await client.fetch(`
            *[_type == "checkin"]{
  ...,
  beer->{..., brewery->},
  venue->{name, city, state},
}|order(dateTime(date) desc)
          `);
          console.log(checkins)
          return checkins.map((checkin) => ({
            id: checkin._id,
            ...checkin
          }))
    }
})

// Expose your defined collection to Astro
// with the `collections` export
export const collections = { beers, breweries,beersByState, checkins };