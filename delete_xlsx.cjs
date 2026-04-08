const fs = require('fs');
const path = require('path');

function deleteXlsxFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        deleteXlsxFiles(fullPath);
      }
    } else if (fullPath.endsWith('.xlsx')) {
      console.log('Deleting:', fullPath);
      fs.unlinkSync(fullPath);
    }
  }
}

deleteXlsxFiles('.');
