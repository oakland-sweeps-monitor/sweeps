import { get } from 'node:https';

const endpoint = 'https://nominatim.openstreetmap.org/search';

async function request(url, address) {
    return new Promise((resolve, reject) => {
        const getOptions = {
            headers: {
                'User-Agent': 'OaklandSweepsMonitor/0.5'
            }
        };
        get(`${url}?q=${address}&format=json&countrycodes=us`, getOptions, response => {
            response.setEncoding('utf8');
            let rawData = '';
            response.on('data', (chunk) => { rawData += chunk; });
            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    console.log(parsedData);
                    resolve(parsedData);
                } catch (e) {
                    console.error(e.message);
                    resolve({});
                }
            });
        }).on('error', e => {
            console.error(e);
            resolve({});
        });
    });
}

export async function search(address) {
    const results = await request(endpoint, `${address}, Oakland, California`);
    await new Promise(resolve => setTimeout(resolve, 1000)); //space out requests by 1 second
    console.log('address search results', { address, results});
    return [];
}