import { JSDOM } from './node_modules/jsdom/lib/api.js';

export async function getUrl(citySiteUrl) {
    const result = await JSDOM.fromURL(citySiteUrl);
    const anchorTag = result.window.document.querySelector('a[aria-label="View the Schedule Homeless Encampment Clean Up Schedule"]');
    return anchorTag.href;
}