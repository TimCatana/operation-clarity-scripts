// dedupe-csv.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const prompt = require('prompt-sync')({ sigint: true });

function main() {
  // Get arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage:');
    console.log('  node dedupe-csv.js <input.csv> <output.csv> [column-index-or-name]');
    console.log('Examples:');
    console.log('  node dedupe-csv.js data.csv cleaned.csv');
    console.log('  node dedupe-csv.js data.csv cleaned.csv 2');
    console.log('  node dedupe-csv.js data.csv cleaned.csv "Email"');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];
  let requestedColumn = args[2]; // optional

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  // Read and parse CSV
  let records;
  try {
    const content = fs.readFileSync(inputFile, 'utf-8');
    records = parse(content, {
      columns: true,        // treat first row as headers
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    console.error('Error parsing CSV:', err.message);
    process.exit(1);
  }

  if (records.length === 0) {
    console.log('CSV is empty.');
    process.exit(0);
  }

  // Get headers
  const headers = Object.keys(records[0]);
  console.log(`Found ${headers.length} column(s):`, headers.join(', '));

  // Decide which column to deduplicate on
  let colKey;
  if (headers.length === 1) {
    colKey = headers[0];
    console.log(`→ Using only column: ${colKey}`);
  } else {
    // Multiple columns → need to choose
    if (!requestedColumn) {
      console.log('\nMultiple columns found. Please choose which column to check for duplicates:');
      headers.forEach((h, i) => console.log(`  ${i + 1}) ${h}`));
      const answer = prompt('Enter number (1–' + headers.length + '): ').trim();
      const idx = parseInt(answer, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= headers.length) {
        console.error('Invalid column selection.');
        process.exit(1);
      }
      colKey = headers[idx];
    } else {
      // Try as number first
      const maybeIndex = parseInt(requestedColumn, 10);
      if (!isNaN(maybeIndex) && maybeIndex >= 1 && maybeIndex <= headers.length) {
        colKey = headers[maybeIndex - 1];
      } else {
        // Try as column name
        const found = headers.find(h => h.toLowerCase() === requestedColumn.toLowerCase());
        if (found) {
          colKey = found;
        } else {
          console.error(`Column "${requestedColumn}" not found in headers.`);
          console.error('Available:', headers.join(', '));
          process.exit(1);
        }
      }
    }
    console.log(`→ Using column: ${colKey}`);
  }

  // Deduplicate
  const seen = new Set();
  const duplicates = [];
  const cleaned = [];

  for (const row of records) {
    const value = (row[colKey] || '').trim();
    if (value === '') continue; // skip empty

    if (seen.has(value)) {
      duplicates.push(row);
    } else {
      seen.add(value);
      cleaned.push(row);
    }
  }

  console.log(`\nTotal rows: ${records.length}`);
  console.log(`Unique rows: ${cleaned.length}`);
  console.log(`Duplicates found: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log('\nDuplicate entries (first occurrence kept):');
    duplicates.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d[colKey]} → ${JSON.stringify(d)}`);
    });
  }

  // Write cleaned CSV
  if (cleaned.length === 0) {
    console.log('No data left after deduplication.');
    return;
  }

  const headerLine = headers.join(',') + '\n';
  const rows = cleaned.map(row =>
    headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  try {
    fs.writeFileSync(outputFile, headerLine + rows);
    console.log(`\nCleaned file written to: ${path.resolve(outputFile)}`);
  } catch (err) {
    console.error('Error writing output file:', err.message);
  }
}

main();