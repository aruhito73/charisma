const puppeteer = require('puppeteer');
const fs = require('fs');

async function testParse() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const html = fs.readFileSync('transfers.html', 'utf8');
    await page.setContent(html);

    const transfers = await page.evaluate(() => {
        const results = [];
        const blocks = document.querySelectorAll('.uiblock-white');
        
        for (const block of blocks) {
            let date = "Неизвестно";
            const blockText = block.innerText.trim();
            const dateMatch = blockText.match(/^(\d{1,2}\s+[а-яА-Я]+\s+\d{4})/);
            if (dateMatch) {
                date = dateMatch[1];
            }
            
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
