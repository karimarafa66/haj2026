const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist/haj-app/browser');
const src = path.join(distDir, 'htaccess');
const dest = path.join(distDir, '.htaccess');

if (fs.existsSync(src)) {
  fs.renameSync(src, dest);
  console.log('Renamed: htaccess → .htaccess in dist/haj-app/browser/');
} else {
  console.warn('Warning: htaccess not found in dist output');
}
