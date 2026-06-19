const fs = require('fs');
const xlsx = require('xlsx');

const buf = fs.readFileSync('public/sample-datasets/expected/Populated Sample - MPI_Coding_Schema_Populated.xlsx');
const workbook = xlsx.read(buf, { type: 'buffer' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

const dataArray = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

let headerRowIndex = 0;
let maxCols = 0;

for (let i = 0; i < Math.min(10, dataArray.length); i++) {
  const row = dataArray[i] || [];
  const validCols = row.filter(cell => typeof cell === 'string' && cell.trim() !== '').length;
  console.log(`Row ${i} valid cols: ${validCols}`, row.slice(0, 5));
  if (validCols > maxCols) {
    maxCols = validCols;
    headerRowIndex = i;
  }
}

console.log('Selected header row index:', headerRowIndex);

const rawRows = xlsx.utils.sheet_to_json(worksheet, { range: headerRowIndex });
console.log('First data row:', rawRows[0]);
