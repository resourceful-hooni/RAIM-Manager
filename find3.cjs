const fs = require('fs');
const path = require('path');

function findFiles(dir, ext) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        findFiles(fullPath, ext);
      }
    } else if (fullPath.endsWith(ext)) {
      console.log(fullPath);
    }
  }
}

findFiles('.', '.xlsx');
