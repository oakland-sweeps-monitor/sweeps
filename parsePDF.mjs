import * as pdfjsLib from './pdfjs-legacy/build/pdf.mjs';
import { appendToList } from './utils.mjs';

function getX(transform) {
    return transform[4];
}

function getY(transform) {
    return transform[5];
}

function withInDelta(a, b, delta = 1) {
    return a >= (b - delta) && a <= (b + delta);
}

async function getDocument(url) {
    const docRequest = pdfjsLib.getDocument(url);
    const doc = await docRequest.promise;
    return doc;
}

function buildRows(items) {
    const final = 
        items.toSorted((a, b) => {
            return b.y - a.y; //y is zero at the bottom of the pdf
        })
        .reduce((rowState, item) => {
            if(rowState.currentRow.y == null) {
                return { rows: rowState.rows, currentRow: { items: appendToList(rowState.currentRow.items, item), y: item.y } };
            }

            const inRow = withInDelta(rowState.currentRow.y, item.y);
            if(inRow) {
                return { rows: rowState.rows, currentRow: { items: appendToList(rowState.currentRow.items, item), y: rowState.currentRow.y } };
            } else {
                const prevRow = {
                    items: rowState.currentRow.items.toSorted((a, b) => a.x - b.x),
                    y: rowState.currentRow.y
                }
                return { rows: appendToList(rowState.rows, prevRow), currentRow: { items: [item], y: item.y } };
            }
        }, { rows: [], currentRow: { items: [], y: null} });

    return appendToList(final.rows, final.currentRow);
}

async function parsePage(doc, pageNumber) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items = 
        textContent.items.map(item => {
            return {
                text: item.str,
                x: getX(item.transform),
                y: getY(item.transform)
            }
        }).filter(item => item.text.trim() !== '');

    const rows = buildRows(items);
    return { pageNumber, rows };
}

export async function parsePdf(pdfUrl) {
    const document = await getDocument(pdfUrl);

    //pdf page numbers start at 1
    const pageNumbers = [...Array(document.numPages).keys()].map(i => i + 1);
    const pagePromises = 
        pageNumbers.map(async (num) => { return await parsePage(document, num); });
    const pages = await Promise.all(pagePromises);

    const rows = pages
        .toSorted((a,b) => a.pageNumber - b.pageNumber)
        .reduce((r, page) => {
            return r.concat(page.rows);
        }, []);
    
    return rows;
}

// const url = 'https://cao-94612.s3.us-west-2.amazonaws.com/documents/Encampment-Clean-up-Schedule-Web-011025.pdf';
// main(url);