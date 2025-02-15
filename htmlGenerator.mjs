import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
// import { search } from './geosearch.mjs';
import path from 'node:path';

function htmlBuilder(template) {
    return {
        html: template,
        chain: (modifier) => {
            return htmlBuilder(modifier(template));
        }
    }
}

function buildReplacer(target, contents) {
    return (html) => html.replace(target, contents);
}

function replaceTitle(title) {
    return buildReplacer('{title}', title);
}

function replaceDescription(description) {
    return buildReplacer('{description}', description);
}

function replaceDate(date) {
    return buildReplacer('{updatedDate}', date);
}

function arrayToTableRow(values) {
    const columns = 
        values
            .map(v => `<td>${v}</td>`)
            .join('');
    return `<tr>${columns}</tr>`;
}

function boolToString(bool) {
    return bool ? '✅ Yes' : '❌ No';
}

function buildInterventionsHtml(interventions) {
    return `<table class='interventions'>
        <thead>
            <tr>
                <th scope='col'>Day of Week</th>
                <th scope='col'>Location</th>
                <th scope='col'>Pile Removal</th>
                <th scope='col'>Garbage Cart</th>
                <th scope='col'>Porta Potty</th>
                <th scope='col'>Wash Stations</th>
                <th scope='col'>Abandoned Auto</th>
            </tr>
        </thead>
        <tbody>
            ${interventions.map(i => arrayToTableRow([
                i.dayOfWeek, 
                i.where, 
                boolToString(i.pileRemoval), 
                boolToString(i.garbageCart),
                boolToString(i.portaPotty),
                boolToString(i.washStations),
                boolToString(i.abandonedAuto)
            ])).join('')}
        </tbody>
    </table>`;
}

function buildOperationsHtml(operations) {
    return `<table class='operations'>
        <thead>
            <tr>
                <th scope='col'>When</th>
                <th scope='col'>Where</th>
                <th scope='col'>Operation</th>
            </tr>
        </thead>
        <tbody>
            ${operations.map(o => arrayToTableRow([
                o.when, 
                o.where, 
                o.what
            ])).join('')}
        </tbody>
    </table>`;
}

function toCSV(header, toRowString, rows) {

    return `${header}
${rows.map(toRowString).join('\n')}`;
}

function csvToUrl (csv) {
    const encoded = new TextEncoder().encode(csv);
    const buffer = Buffer.from(encoded);
    const base64 = buffer.toString('base64');
    return `data:text/csv;base64,${base64}`;
}

function replaceSchedule(title, pdfUrl, operations, interventions) {

    const operationsHtml = buildOperationsHtml(operations);
    const interventionsHtml = buildInterventionsHtml(interventions);

    const operationsCsv = toCSV('When,Where,Operation', op => {
        return [op.when,op.where,op.what].join(',');
    }, operations);
    const operationsUrl = csvToUrl(operationsCsv);

    const interventionsCsv = toCSV('DayOfWeek,Where,Pile Removal,Garbage Cart,Porta Potty,Wash Stations,Abandoned Auto', i => {
        return [
            i.dayOfWeek, 
            i.where, 
            i.pileRemoval, 
            i.garbageCart,
            i.portaPotty,
            i.washStations,
            i.abandonedAuto
        ].join(',');
    }, interventions);
    const interventionsUrl = csvToUrl(interventionsCsv);

    const scheduleHtml = `
    <h1>${title}</h1>
    <div class='pdf-url'>
        <a target='_blank' href='${pdfUrl}'>🔗 Pdf Schedule</a>
    </div>
    <div class='schedule'>
        <section>
        <h2><a download='operations.csv' href='${operationsUrl}'>Operations</a></h2>
        ${operationsHtml}
        </section>
        <section>
        <h2><a download='operations.csv' href='${interventionsUrl}'>Interventions</a></h2>
        ${interventionsHtml}
        </section>
    </div>`

    return buildReplacer('{schedule}', scheduleHtml);
}

// async function optToMapMarker(opt) {
//     const location = await search(opt.where);
//     const text = `<div>${opt.where}</div><div>${opt.when}</div><div>${opt.what}</div>`;
//     return { gps: location, text };
// }

// async function interToMapMarker(inter) {
//     const location = await search(inter.where);
//     const actions = [
//         inter.pileRemoval ? 'Pile Removal' : '', 
//         inter.garbageCart ? 'Garbage Cart' : '',
//         inter.portaPotty ? 'Porta Potty' : '',
//         inter.washStations ? 'Wash Stations' : '',
//         inter.abandonedAuto ? 'Abandoned Auto' : ''
//     ]
//         .filter(a => a !== '')
//         .join(';');
//     const text = `<div>${inter.where}</div><div>${inter.dayOfWeek}</div><div>${actions}</div>`;
//     return { gps: location, text };
// }

// async function* buildMapMarkers(items, func) {
//     for (const item of items) {
//         yield await func(item);
//     }
// }

// async function replaceMapData(operations, interventions) {
//     const opData = await Array.fromAsync(buildMapMarkers(operations, optToMapMarker));
//     const interData = await Array.fromAsync(buildMapMarkers(interventions, interToMapMarker));
//     const data = [
//         ...opData.filter(d => d && d.gps.length > 0),
//         ...interData.filter(d => d && d.gps.length > 0)
//     ]
//     return buildReplacer('{mapData}', data);
// }

async function loadTemplate(file) {
    const template = await fs.readFile(file, { encoding: 'utf8' });
    return template;
}

async function write(file, html) {
    await fs.writeFile(file, html, { encoding: 'utf8' });
}

export async function generate(templateFile, destinationFolder, schedule) {
    const template = await loadTemplate(templateFile);

    // const mapDataReplacer = await replaceMapData(schedule.operations, schedule.interventions);

    const html =
        htmlBuilder(template)
            .chain(replaceTitle(schedule.title))
            .chain(replaceDescription(schedule.description))
            .chain(replaceDate(schedule.date))
            .chain(replaceSchedule(schedule.title, schedule.pdfUrl, schedule.operations, schedule.interventions))
            // .chain(mapDataReplacer)
            .html;
    
    const dateFileName = schedule.scheduleDate.replaceAll('/', '-');
    write(path.join(destinationFolder, 'index.html'), html);
    write(path.join(destinationFolder, `${dateFileName}.html`), html);
    write(path.join(destinationFolder, 'data', `${dateFileName}-operations.json`), JSON.stringify(schedule.operations));
    write(path.join(destinationFolder, 'data', `${dateFileName}-interventions.json`), JSON.stringify(schedule.interventions));
}