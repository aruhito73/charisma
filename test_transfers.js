const puppeteer = require('puppeteer');
const fs = require('fs');

async function testTransfers() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Bypass DDOS
    await page.goto('https://cyberfootball.online/arena/language?s=ru', { waitUntil: 'networkidle2' });
    
    await page.goto('https://cyberfootball.online/clubs/transfers/20048', { waitUntil: 'networkidle2' });
    
    try {
        await page.evaluate(() => {
            if (document.body.innerText === '') {
                const script = document.querySelector('script');
                if (script && script.innerText.includes('set_cookie')) eval(script.innerText);
            }
        });
    } catch (e) {}
    
    await page.waitForSelector('body', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 5000));
    
    const html = await page.content();
    fs.writeFileSync('transfers.html', html);
    
    await browser.close();
}
testTransfers();
