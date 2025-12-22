const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Book name → number mapping (1=Genesis ... 66=Revelation)
const BOOK_MAP = {
    genesis: 1, gen: 1, ge: 1,
    exodus: 2, exo: 2, ex: 2,
    leviticus: 3, lev: 3, le: 3,
    numbers: 4, num: 4, nu: 4,
    deuteronomy: 5, deut: 5, de: 5,
    joshua: 6, josh: 6, jos: 6,
    judges: 7, judg: 7, jdg: 7,
    ruth: 8,
    '1samuel': 9, '1sam': 9, '1sa': 9,
    '2samuel': 10, '2sam': 10, '2sa': 10,
    '1kings': 11, '1kgs': 11, '1ki': 11,
    '2kings': 12, '2kgs': 12, '2ki': 12,
    '1chronicles': 13, '1chr': 13, '1ch': 13,
    '2chronicles': 14, '2chr': 14, '2ch': 14,
    ezra: 15,
    nehemiah: 16, neh: 16,
    esther: 17, esth: 17,
    job: 18,
    psalms: 19, psalm: 19, ps: 19, psa: 19,
    proverbs: 20, prov: 20, pro: 20, pr: 20,
    ecclesiastes: 21, eccles: 21, ecc: 21,
    'songofsolomon': 22, 'songofsongs': 22, song: 22, sos: 22,
    isaiah: 23, isa: 23, is: 23,
    jeremiah: 24, jer: 24,
    lamentations: 25, lam: 25,
    ezekiel: 26, ezek: 26, eze: 26,
    daniel: 27, dan: 27, da: 27,
    hosea: 28, hos: 28,
    joel: 29,
    amos: 30,
    obadiah: 31, obad: 31, ob: 31,
    jonah: 32,
    micah: 33, mic: 33,
    nahum: 34, nah: 34,
    habakkuk: 35, hab: 35,
    zephaniah: 36, zeph: 36, zep: 36,
    haggai: 37, hag: 37,
    zechariah: 38, zech: 38, zec: 38,
    malachi: 39, mal: 39,
    matthew: 40, matt: 40, mt: 40,
    mark: 41, mk: 41,
    luke: 42, lk: 42,
    john: 43, jn: 43,
    acts: 44,
    romans: 45, rom: 45, ro: 45,
    '1corinthians': 46, '1cor': 46, '1co': 46,
    '2corinthians': 47, '2cor': 47, '2co': 47,
    galatians: 48, gal: 48, ga: 48,
    ephesians: 49, eph: 49, ep: 49,
    philippians: 50, phil: 50, php: 50,
    colossians: 51, col: 51,
    '1thessalonians': 52, '1thess': 52, '1th': 52,
    '2thessalonians': 53, '2thess': 53, '2th': 53,
    '1timothy': 54, '1tim': 54, '1ti': 54,
    '2timothy': 55, '2tim': 55, '2ti': 55,
    titus: 56,
    philemon: 57, philem: 57, phm: 57,
    hebrews: 58, heb: 58,
    james: 59, jas: 59,
    '1peter': 60, '1pet': 60, '1pe': 60,
    '2peter': 61, '2pet': 61, '2pe': 61,
    '1john': 62, '1jn': 62, '1jo': 62,
    '2john': 63, '2jn': 63, '2jo': 63,
    '3john': 64, '3jn': 64, '3jo': 64,
    jude: 65,
    revelation: 66, rev: 66, re: 66,
};

// === COMMAND LINE ARGUMENTS ===
if (process.argv.length !== 5) {
    console.log('Usage: node lookup-verses.js <input.csv> <output.csv> <bibleFolderPath>');
    console.log('Example: node lookup-verses.js verses.csv results.csv ./bibles');
    process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];
const bibleJsonFolder = process.argv[4];

if (!fs.existsSync(bibleJsonFolder)) {
    console.error(`Error: Bible folder not found: ${bibleJsonFolder}`);
    process.exit(1);
}

// === EASILY CUSTOMIZABLE VERSE CLEANING FUNCTION ===
function cleanVerse(text) {
    if (!text) return '';

    let cleaned = text.trim();

    // TOGGLE THESE BY COMMENTING/UNCOMMENTING

    // Remove leading Psalm titles (e.g., <i>A Psalm of David...</i>)
    cleaned = cleaned.replace(/^<i>.*?<\/i>\s*/i, '');

    // Remove all italic tags but keep the words
    cleaned = cleaned.replace(/<\/i>\s*<i>/g, ' ');
    cleaned = cleaned.replace(/<i>|<\/i>/g, '');

    // Remove ALL quotes (straight + curly, single + double)
    cleaned = cleaned.replace(/["“”'‘’]/g, '');

    // Alternative: Only remove surrounding quotes around the whole verse
    cleaned = cleaned.replace(/^["“](.*)["”]$/, '$1').trim();
    cleaned = cleaned.replace(/^['‘](.*)['’]$/, '$1').trim();

    // Collapse multiple spaces, tabs, newlines into one space
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Fix spacing around common punctuation
    cleaned = cleaned.replace(/\s*,\s*/g, ', ');
    cleaned = cleaned.replace(/\s*;\s*/g, '; ');
    cleaned = cleaned.replace(/\s*:\s*/g, ': ');
    cleaned = cleaned.replace(/\s*\.\s*/g, '. ');
    cleaned = cleaned.replace(/\s*\?\s*/g, '? ');
    cleaned = cleaned.replace(/\s*!\s*/g, '! ');

    // Remove any space before punctuation
    cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1');

    // Final trim
    return cleaned.trim();
}

// === LOAD BIBLES WITH CLEANING ===
const bibles = {};
['NKJV', 'ESV', 'KJV'].forEach(trans => {
    const filePath = path.join(bibleJsonFolder, `${trans}.json`);
    if (!fs.existsSync(filePath)) {
        console.error(`Error: ${trans}.json not found at ${filePath}`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const lookup = new Map();

    data.forEach(v => {
        const cleaned = cleanVerse(v.text);
        const key = `${v.book}-${v.chapter}-${v.verse}`;
        lookup.set(key, cleaned);
    });

    bibles[trans] = lookup;
    console.log(`✓ Loaded ${trans} (${lookup.size} cleaned verses)`);
});

// === REFERENCE PARSING ===
function parseReference(ref) {
    const match = ref.trim().match(/^(.+?)\s+(\d+):(\d+(?:-\d+)?)$/i);
    if (!match) throw new Error(`Invalid format: ${ref}`);

    let bookPart = match[1].toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
    const chapter = parseInt(match[2]);
    const versePart = match[3];

    let bookNum = /^\d+$/.test(bookPart) ? parseInt(bookPart) : BOOK_MAP[bookPart];
    if (!bookNum) throw new Error(`Unknown book: ${match[1]}`);

    return { bookNum, chapter, versePart };
}

// === PROCESS INPUT CSV ===
const results = [];

fs.createReadStream(inputFile)
    .pipe(csv({ headers: false }))
    .on('data', (row) => {
        let reference, translation = 'NKJV';

        // Flexible detection
        if (row['0'] !== undefined) {
            reference = row['0']?.trim();
            translation = (row['1']?.trim() || 'NKJV').toUpperCase();
        } else if (row.reference !== undefined) {
            reference = row.reference?.trim();
            translation = (row.translation || 'NKJV').trim().toUpperCase();
        } else {
            const values = Object.values(row);
            reference = values[0]?.trim();
            translation = (values[1] || 'NKJV').trim().toUpperCase();
        }

        if (!reference) {
            results.push({ reference: '', translation, text: 'ERROR: Empty reference' });
            return;
        }

        if (!bibles[translation]) {
            results.push({ reference, translation, text: 'ERROR: Unknown translation (NKJV, ESV, KJV)' });
            return;
        }

        try {
            const { bookNum, chapter, versePart } = parseReference(reference);

            if (versePart.includes('-')) {
                const [start, end] = versePart.split('-').map(Number);
                const verses = [];
                for (let v = start; v <= end; v++) {
                    const key = `${bookNum}-${chapter}-${v}`;
                    const txt = bibles[translation].get(key);
                    if (txt) verses.push(txt);
                }
                const fullText = verses.join(' ');
                results.push({ reference, translation, text: fullText || 'ERROR: Range not found' });
            } else {
                const verse = parseInt(versePart);
                const key = `${bookNum}-${chapter}-${verse}`;
                const text = bibles[translation].get(key) || 'ERROR: Verse not found';
                results.push({ reference, translation, text });
            }
        } catch (err) {
            results.push({ reference, translation, text: `ERROR: ${err.message}` });
        }
    })
    .on('end', () => {
        const csvWriter = createCsvWriter({
            path: outputFile,
            header: [
                { id: 'reference', title: 'reference' },
                { id: 'translation', title: 'translation' },
                { id: 'text', title: 'text' },
            ],
        });

        csvWriter.writeRecords(results)
            .then(() => console.log(`\nSuccess! ${results.length} verses processed and saved to: ${outputFile}`))
            .catch(err => console.error('Error writing CSV:', err));
    })
    .on('error', (err) => console.error('Error reading input:', err.message));