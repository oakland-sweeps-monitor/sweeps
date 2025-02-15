import fs from 'node:fs/promises';
import { parsePdf } from './parsePDF.mjs';
import { buildSchedule } from './sweeps.mjs';
import { generate } from './htmlGenerator.mjs';
import { getUrl } from './website.mjs';

async function getPreviousUrl(savedFile) {
    try {
        const previousUrl = await fs.readFile(savedFile, { encoding: 'utf8' });
        return previousUrl;
    } catch (err) {
        console.log('Warning: Could not find previous url', err.message);
        return '';
    }
}

async function saveUrl(path, url) {
    await fs.writeFile(path, url, { encoding: 'utf8' });
}

async function main(cityUrl) {
    const url = await getUrl(cityUrl);

    const savedUrlFile = './previousurl.txt';
    const previousUrl = await getPreviousUrl(savedUrlFile);

    if(url === previousUrl) {
        console.log("already fetched url", previousUrl);
        return;
    }

    const rows = await parsePdf(url);
    const schedule = buildSchedule(rows);

    console.log("schedule", schedule);

    generate('./template.html', './site', { 
        pdfUrl: url,
        title: `Sweeps ${schedule.updatedDate} - City of Oakland`, 
        description: `The published planned homeless encampment actions of the City of Oakland from ${cityUrl}`, 
        date: `City data updated on ${schedule.updatedDate}. This page created on ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`,
        operations: schedule.operations,
        interventions: schedule.interventions,
        scheduleDate: schedule.updatedDate
    });

    await saveUrl(savedUrlFile, url);
}

const sweepsSiteUrl = 'https://www.oaklandca.gov/resources/homeless-encampment-cleanup-schedule';
main(sweepsSiteUrl);