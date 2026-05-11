const puppeteer = require('puppeteer');
const fs = require('fs');

async function testParse() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const html = fs.readFileSync('transfers.html', 'utf8');
    await page.setContent(html);

    const data = await page.evaluate(() => {
        const results = [];
        // Look for items. We can just iterate over all text nodes or specific blocks.
        // Let's find blocks that contain transfer info.
        const transferBlocks = document.querySelectorAll('.transfer-item, .transfers-list .item, .col-md-12, .row');
        // Actually, looking at the text:
        // "12 апреля 2026 fezake NOMERCY eSp 20:27 CHARISMA"
        // Let's just find the elements that contain date and names.
        
        // The transfer page often has `.reaction-item` or similar. Let's list all classes of divs that have text.
        const divs = document.querySelectorAll('div');
        const classNames = new Set();
        for (const div of divs) {
            if (div.innerText && div.innerText.includes('CHARISMA')) {
                classNames.add(div.className);
            }
        }
        return Array.from(classNames);
    });
    
    console.log(data);
    await browser.close();
}
testParse();
