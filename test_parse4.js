const puppeteer = require('puppeteer');
const fs = require('fs');

async function testParse() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const html = fs.readFileSync('transfers.html', 'utf8');
    await page.setContent(html);

    const transfers = await page.evaluate(() => {
        const results = [];
        
        // Find all uiblock-white that might contain the transfers list
        const blocks = document.querySelectorAll('.uiblock-white');
        
        for (const block of blocks) {
            // Check if this block has a date header
            const dateHeader = block.querySelector('.text-center.fs11');
            let date = "Неизвестно";
            if (dateHeader && dateHeader.innerText.match(/\d+ [а-яА-Я]+ \d{4}/)) {
                date = dateHeader.innerText.trim();
            }
            
            // Now find all rows inside this block
            const rows = block.querySelectorAll('.arena-transfer-row');
            for (const row of rows) {
                const playerEl = row.querySelector('a[href*="/player/"], a[href*="/players/"]');
                const player = playerEl ? playerEl.innerText.trim() : row.innerText.trim().split('\n')[0];
                
                const teamEls = Array.from(row.querySelectorAll('.team-name')).map(el => el.innerText.trim());
                if (teamEls.length >= 2 && teamEls[1] === 'CHARISMA') {
                    results.push({ player, date });
                }
            }
        }
        return results;
    });
    
    console.log("Transfers:", transfers.slice(0, 15));
    await browser.close();
}
testParse();
