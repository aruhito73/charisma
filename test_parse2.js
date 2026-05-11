const puppeteer = require('puppeteer');
const fs = require('fs');

async function testParse() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const html = fs.readFileSync('transfers.html', 'utf8');
    await page.setContent(html);

    const transfers = await page.evaluate(() => {
        const rows = document.querySelectorAll('.arena-transfer-row');
        const data = [];
        for (const row of rows) {
            const dateEl = row.querySelector('.transfer-date, h4, .text-muted, [class*="date"]'); // Or maybe the date is before the row? 
            // In the text output we saw: 12 апреля 2026 fezake NOMERCY eSp 20:27 CHARISMA
            // Let's just grab the whole text of the row and see.
            const fullText = row.innerText.trim();
            // Usually the row has team names inside .team-name
            const teamNames = Array.from(row.querySelectorAll('.team-name')).map(el => el.innerText.trim());
            // And player name inside <a> tag with href containing /player/
            const playerEl = row.querySelector('a[href*="/player/"], a[href*="/players/"]');
            const playerName = playerEl ? playerEl.innerText.trim() : null;
            
            data.push({
                fullText,
                teamNames,
                playerName
            });
        }
        return data;
    });
    
    console.log(transfers.slice(0, 3));
    
    // Check how dates are structured. Are they siblings?
    const dateHeaders = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.date-header, h3, h4')).map(el => el.innerText.trim()).filter(t => /\d+ [а-яА-Я]+ \d+/.test(t));
    });
    console.log("Date headers:", dateHeaders.slice(0, 5));

    await browser.close();
}
testParse();
