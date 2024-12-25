import pkg from 'rss-to-json';
import client from '../../utils/sanityClient.mjs';
const {parse} = pkg;

export const prerender = false;

export async function GET({params, request}) {
  console.log('running rescrape')
  console.log(import.meta.env.SITE_URL + `/api/processCheckin`)
  const rss = await parse('https://untappd.com/rss/user/glrob54?key=22bf8950a97512ac2b5da8bb7617ab76')

  const mappedData = rss.items.map(item => {
    const date = new Date(item.published);
    const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 00:00`;
    const id = item.link.split('/').pop();
    return {
        ...item,
        _type: 'checkin',
        date: formattedDate,
        untappdUrl: item.link,
        _id: id,
    }
  })
  // console.log(mappedData.map(item => item._id))
  const checkinsInSanity = await client.fetch('*[_type == "checkin" && $ids match _id]{_id}._id', {ids: mappedData.map(item => item._id)});
  
  // new array of checkins that are not in sanity
  const checkinsToCreate = mappedData.filter(item => !checkinsInSanity.includes(item._id));
  console.log(checkinsToCreate.length)

  
  let checkinsSentToSanity = []
  // create checkins in sanity
  for (const checkin of checkinsToCreate) {
    //strip venue ID from 
    try {
      checkinsInSanity.push(await client.create({
        _type: 'checkin',
        date: checkin.date,
        untappdLink: checkin.untappdUrl,
        _id: checkin._id,
        processed: false
      }));
      // hit api endpoint attachBeerAndLocationUrl
      fetch(import.meta.env.SITE_URL + `/api/processCheckin?checkinUrl=${checkin.untappdUrl}&checkinId=${checkin._id}`, {
        method: 'GET',

        headers: {
          'Content-Type': 'application/json'
        },

      });
      
    } catch (error) {
      console.error(error);
    }
  }




  // const mappedData = rss.items.map(item => {
  //   const date = new Date(item.published);
  //   const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  //   const id = item.link.split('/').pop();
  //   // console.log(id);
  //   const data = {
  //     _type: 'checkin',
  //     _id: id,
  //     date: formattedDate,
  //     link: item.link,
  //     processed: false
  //   }
  //   console.log(data);
  //   // client.createOrReplace(data).then(res => {
  //   //   console.log(res);
  //   // }
  //   // ).catch(err => {
  //   //   console.error(err);
  //   // }
  //   // )
  //   return data
  // })
  

    return new Response(
      JSON.stringify({
        name: 'Astro',
        url: 'https://astro.build/',
        checkinsToCreate
      })
    )
  }