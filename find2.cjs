const fs = require('fs');
const path = require('path');

function findFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        findFiles(fullPath);
      }
    } else if (file.includes('상시교육프로그램') || file.includes('라임PLAY') || file.includes('현황')) {
      console.log(fullPath);
    }
  }
}

findFiles('.');
