const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const remoteBase = 'ftp://host1719768_richmond:!!110238!!@ftp6.hostland.ru/vfc-charisma.ru/htdocs/www/';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        if (['.git', 'node_modules', '.github', '.vercel'].includes(file) || file.endsWith('.zip') || file.endsWith('.bat') || file.endsWith('.md')) return;
        if (['package.json', 'package-lock.json', 'update-data.js', 'download-avatars.js', 'deploy_curl.js', 'ftp_test.txt'].includes(file)) return;

        let fullPath = path.join(dir, file);
        let stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('d:/charisma');
console.log('Found ' + files.length + ' files to upload.');

files.forEach(file => {
    let relPath = path.relative('d:/charisma', file).replace(/\\/g, '/');
    let url = remoteBase + relPath;
    console.log('Uploading: ' + relPath);
    try {
        execSync(`curl.exe -s --ftp-create-dirs -T "${file}" "${url}"`, { stdio: 'ignore' });
    } catch (e) {
        console.error('Failed on ' + relPath);
    }
});
console.log('Done uploading all files!');
