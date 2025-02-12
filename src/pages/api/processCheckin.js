import puppeteer from 'puppeteer';
import client from '../../utils/sanityClient.mjs';
import * as cheerio from 'cheerio';


export const prerender = false;


async function getBeerDetails(url, brewery, rating, date) {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const beer = {
        name: $('.name h1').text(),
        style: $('.style').text(),
        abv: parseFloat($('.abv').text().replace('% ABV', '')),
        ibu: parseFloat($('.ibu').text().replace(' IBU', '')),
        image: $('.label img').attr('src')
    }
    
    const result = await client.create({
        _type: 'beer',
        ...beer,
        myScore: rating,
        firstTaste: date,
        untappdLink: url,
        brewery: {
            _type: 'reference',
            _ref: brewery
        }
    });
    return result._id;
}

async function getBreweryDetails(url) {

    /* gets brewery details from untappd, pushes details into Sanity, and returns a Sanity brewery ID */
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const brewery = {
        name: $('.name h1').text(),
        location: $('.brewery').text()
    }
    const [city, stateCountry] = brewery.location.split(', ');
    if (!stateCountry.includes('United States')) {
        brewery.city = city;
        brewery.state = stateCountry;
    } else {
        const [state, country] = stateCountry.split(' United States');
        brewery.city = city;
        brewery.state = state;
        brewery.country = country;
    }


    const result = await client.create({
        _type: 'brewery',
        ...brewery,
        untappdLink: url
    });
    console.log(`Brewery created with ID ${result._id}`);
    return result._id
}

async function getVenueDetails(locationUrl) {

    const response = await fetch(locationUrl);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const venue = {
        name: $('.name').text(),
        address: $('.address').text(),
        logoUrl: $('.image-big img').attr('src')
    }
    
    const addressArray = venue.address.split(', ')
    const state = addressArray[1]
    const notState = addressArray[0]
    const streetAbr = ["Ave", "Pkwy", "Dr", "St", "Cir", "Rd", "Road", ")", "Street", "Blvd", "Parkway", "Ct"]
    const containsStreetAbr = streetAbr.some(abr => notState.includes(abr));
    if (containsStreetAbr) {
        const matchingAbr = streetAbr.find(abr => notState.includes(abr));
        const stringArray = notState.split(matchingAbr + ' ')
        if (stringArray.length > 1) {
            venue.city = stringArray[stringArray.length - 1]
        } 
    }
    const logoUrl = $('.image-big img').attr('src');

    const urlSplit = locationUrl.split('/')
    const venueDoc = {
        _type: 'venue',
        _id: urlSplit[urlSplit.length-1],
        slug: urlSplit[urlSplit.length -2],
        locationUrl,
        city,
        state,
        logoUrl
    };
    console.log(venueDoc)

    const result = await client.create(venueDoc);
    console.log(`Venue created with ID ${result._id}`);
    return result._id;
}
    

export async function GET({params, request}) {
    console.log('start processing')
    let venueId, breweryId;
    // get checkin url from query parameters
    const url = new URL(request.url);
    const {checkinUrl} = Object.fromEntries(url.searchParams);
    const checkinId = checkinUrl.split('/').pop();

    const response = await fetch(checkinUrl);
    const html = await response.text();
    const $ = cheerio.load(html);
    const beerLink = `https://untappd.com${$('.beer a').attr('href')}`;
    const beerName = $('.beer > p a').text();
    const breweryLink = `https://untappd.com${$('.beer span a').attr('href')}`;
    const venueLink = `https://untappd.com${$('.location a').attr('href')}`;
    const date = $('.time').text();
    const dateObject = new Date(date);
    const formattedDate = `${dateObject.getFullYear()}-${dateObject.getMonth() + 1}-${dateObject.getDate()}`;
    const rating = $('.rating-serving .caps').data('rating');
    const startingData = {
        beerLink,
        beerName,
        breweryLink,
        venueLink,
        date: formattedDate,
        rating
    }
    console.log({startingData});

    const sanityData = await client.fetch(`{ 
        "sanityBeer": *[_type == "beer" && name == $name && brewery->untappdLink == $breweryUrl]{_id},
        "sanityBrewery": *[_type == "brewery" && untappdLink == $breweryUrl]{_id},
        "sanityVenue": *[_type == "venue" && untappdLink == $venueUrl]{_id}
        }`, {
            name: startingData.beerName,
            breweryUrl: startingData.breweryLink,
            venueUrl: startingData.venueLink
        });
    console.log({sanityData});
    // If beer is already in Sanity, return early
    if (sanityData?.sanityBeer.length > 0) {
        console.log('beer already in sanity')
        
        return new Response(JSON.stringify({beerId: sanityData?.sanityBeer[0]._id, startingData}));
    }

    // If venue already exists, set venueId to the existing venue ID
    if (sanityData?.sanityVenue.length > 0) {
        venueId = sanityData.sanityVenue[0]._id;
    } else if (startingData.venueLink.includes('at-home')) {
        venueId = '9917985';
    } else {
        venueId = await getVenueDetails(startingData.venueLink);
    }

    // If brewery already exists, set breweryId to the existing brewery ID
    if (sanityData?.sanityBrewery.length > 0) {
        breweryId = sanityData.sanityBrewery[0]._id;
    } else {
        breweryId = await getBreweryDetails(startingData.breweryLink);
    }
    console.log({breweryId});
    const beerId = await getBeerDetails(startingData.beerLink, breweryId, startingData.rating, startingData.date)
    

    // patch checkin with beer reference and venue reference
    console.log(checkinId)
    const updatedCheckin = await client.patch(checkinId).set({
        processed: true,
        beer: {
            _type: 'reference',
            _ref: beerId
        },
        venue: {
            _type: 'reference',
            _ref: venueId
        }
    }).commit();
    console.log(updatedCheckin);

    return new Response(JSON.stringify({beerId, startingData, breweryId, venueId}));

}