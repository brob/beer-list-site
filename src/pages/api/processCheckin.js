import puppeteer from 'puppeteer';
import client from '../../utils/sanityClient.mjs';
export const prerender = false;


async function getBeerDetails(url, brewery, rating, date) {
    
    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const beer = await page.evaluate((rating) => {
        const name = document.querySelector('.name h1').innerText;
        const style = document.querySelector('.style').innerText;
        const abv = parseFloat(document.querySelector('.abv').innerText.replace('% ABV', ''))
        const ibu = parseFloat(document.querySelector('.ibu').innerText.replace(' IBU', ''))
        const image = document.querySelector('.label img').src;
        return {
            name,
            style,
            abv,
            ibu,
            image,
           
        }
    });

    await browser.close();
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
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    const brewery = await page.evaluate((url) => {
        console.log({url})
        const name = document.querySelector('.name h1').innerText;
        const location = document.querySelector('.brewery').innerText;
        // split location into city and state
        const [city, stateCountry] = location.split(', ');

        if (!stateCountry.includes('United States')) {
            return {
                name: name,
                untappdLink: url,
                city, state: stateCountry, country: ''
            }
        } 
    
        const [state, country] = stateCountry.split(' United States')

        return {
            name: name,
            city,state,country
        }

        const image = document.querySelector('.label img').src;
        return {
            name,
            location,
            image
        }
    }
    );
    await browser.close();

    const result = await client.create({
        _type: 'brewery',
        ...brewery,
        untappdLink: url
    });
    console.log(`Brewery created with ID ${result._id}`);
    return result._id
}

async function getVenueDetails(locationUrl) {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(locationUrl);
    let city;
    let address = await page.$eval('.address', el => el.textContent.trim());
    address = address.replace(' ( Map )', '');
    const addressArray = address.split(', ')
    const state = addressArray[1]
    const notState = addressArray[0]
    const streetAbr = ["Ave", "Pkwy", "Dr", "St", "Cir", "Rd", "Road", ")", "Street", "Blvd", "Parkway", "Ct"]
    const containsStreetAbr = streetAbr.some(abr => notState.includes(abr));
    if (containsStreetAbr) {
        // console.log(`${notState} contains a street abbreviation`);
        const matchingAbr = streetAbr.find(abr => notState.includes(abr));
        const stringArray = notState.split(matchingAbr + ' ')
        if (stringArray.length > 1) {
            city = stringArray[stringArray.length - 1]
            console.log(city)
            // const result = await client.patch(venue._id).set({city}).commit();
            console.log(`Venue address added to venue with ID NOT REALLY`);

        } 
    }

    const logoUrl = await page.$eval('.image-big img', img => img.src);
    const urlSplit = locationUrl.split('/')
    const venueDoc = {
        _type: 'venue',
        _id: urlSplit[urlSplit.length-1],
        slug: urlSplit[urlSplit.length -2],
        locationUrl,
        address,
        city,
        state,
        logoUrl
    };
    console.log(venueDoc)

    await browser.close();
    const result = await client.create(venueDoc);
    console.log(`Venue created with ID ${result._id}`);
    return result._id;
}
    

export async function GET({params, request}) {
    let venueId, breweryId;
    // get checkin url from query parameters
    const url = new URL(request.url);
    const {checkinUrl} = Object.fromEntries(url.searchParams);
    const checkinId = checkinUrl.split('/').pop();

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(checkinUrl);

    const startingData = await page.evaluate(() => {
        const beerName = document.querySelector('.beer a').innerText;

        const rating = parseFloat(document.querySelector('.caps').getAttribute('data-rating'),2);
        const beerLink = document.querySelector('.beer a').href;
        const breweryLink = document.querySelector('.beer span a').href;
        const venueLink = document.querySelector('.location a').href;
        const date = document.querySelector('.time').innerText;
        const dateObject = new Date(date);
        const formattedDate = `${dateObject.getFullYear()}-${dateObject.getMonth() + 1}-${dateObject.getDate()}`;

        return {
            beerName,
            rating,
            beerLink,
            breweryLink,
            venueLink,
            date: formattedDate
        }
    })
    await browser.close()
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