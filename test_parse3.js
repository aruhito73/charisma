const puppeteer = require('puppeteer');
const fs = require('fs');

async function testParse() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const html = fs.readFileSync('transfers.html', 'utf8');
    await page.setContent(html);

    const transfers = await page.evaluate(() => {
        // Find all transfers items.
        // It seems dates are somehow before the .arena-transfer-row items.
        // Let's get the parent of arena-transfer-row and look at its children.
        const parent = document.querySelector('.transfers-items-list') || document.querySelector('.arena-transfer-row').parentNode;
        
        const results = [];
        let currentDate = "Неизвестно";
        
        for (const child of parent.children) {
            if (child.className && child.className.includes('uiblock-white')) {
                // Inside uiblock-white there might be a date?
                const dateEl = child.querySelector('.text-center');
                if (dateEl) {
                    currentDate = dateEl.innerText.trim();
                }
            } else if (child.innerText && child.innerText.match(/^\d+ [а-яА-Я]+ \d{4}/)) {
                currentDate = child.innerText.trim();
            } else if (child.querySelector('.arena-transfer-row')) {
                const row = child.querySelector('.arena-transfer-row');
                const fullText = row.innerText.trim().split('\n');
                const player = fullText[0];
                const teamNames = Array.from(row.querySelectorAll('.team-name')).map(el => el.innerText.trim());
                if (teamNames.length >= 2 && teamNames[1] === 'CHARISMA') {
                    results.push({
                        player,
                        date: currentDate
                    });
                }
            } else {
                // If the child itself is the row
                if (child.classList && child.classList.contains('arena-transfer-row')) {
                    const row = child;
                    const fullText = row.innerText.trim().split('\n');
                    const player = fullText[0];
                    const teamNames = Array.from(row.querySelectorAll('.team-name')).map(el => el.innerText.trim());
                    if (teamNames.length >= 2 && teamNames[1] === 'CHARISMA') {
                        results.push({
                            player,
                            date: currentDate
                        });
                    }
                }
                
                // Let's also check if inside child there are BOTH date and row
                const dateHeader = child.querySelector('.text-center, h3, h4, .date-header');
                if (dateHeader && dateHeader.innerText.match(/^\d+ /)) {
                    currentDate = dateHeader.innerText.trim();
                }
                const rows = child.querySelectorAll('.arena-transfer-row');
                for (const row of rows) {
                    const fullText = row.innerText.trim().split('\n');
                    const player = fullText[0];
                    const teamNames = Array.from(row.querySelectorAll('.team-name')).map(el => el.innerText.trim());
                    if (teamNames.length >= 2 && teamNames[1] === 'CHARISMA') {
                        results.push({
                            player,
                            date: currentDate
                        });
                    }
                }
            }
        }
        return results;
    });
    
    console.log(transfers);
    
    // Alternative: Let's just find the date nodes
    const allDivs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.uiblock-white')).map(el => el.innerText.trim().substring(0, 50).replace(/\n/g, ' '));
    });
    console.log("All uiblock-white:", allDivs.slice(0, 5));
    
    await browser.close();
}
testParse();
