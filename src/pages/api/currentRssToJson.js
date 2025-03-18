import pkg from 'rss-to-json';
const {parse} = pkg;

export const prerender = false;



export async function GET({params, request}) {

    const rss = await parse('https://untappd.com/rss/user/glrob54?key=22bf8950a97512ac2b5da8bb7617ab76')

    return new Response(JSON.stringify(rss), {
        headers: {
            'Content-Type': 'application/json'
        }
    })
}