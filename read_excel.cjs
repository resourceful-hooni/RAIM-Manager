const XLSX = require('xlsx');
const fs = require('fs');

try {
  const workbook = XLSX.readFile('src/상시교육프로그램(라임PLAY) 현황3.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  
  console.log("Sheet Name:", sheetName);
  console.log("First 30 rows:");
  for (let i = 0; i < Math.min(30, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
  }
} catch (e) {
  console.error(e);
}
