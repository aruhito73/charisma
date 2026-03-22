/**
 * CHARISMA Data Updater
 * 
 * Scrapes data from cyberfootball.online and saves JSON files.
 * 
 * Usage:
 *   npm install puppeteer
 *   node update-data.js
 * 
 * This will update: data/squad.json, data/league.json, data/cup.json, data/achievements.json, data/schedule.json
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');

// =========================================================================
// ОСНОВНЫЕ НАСТРОЙКИ СКРЕЙПЕРА
// Здесь указываются ID вашего клуба и текущих турниров на сайте Cyberfootball.online
// Чтобы обновить таблицы нового сезона, просто поменяйте ID лиги и кубка здесь!
// =========================================================================
const CLUB_ID = 20048; // ID клуба CHARISMA
const LEAGUE_ID = 1235; // ID текущего сезона лиги
const CUP_ID = 1243; // ID текущего кубка

// ===== FTP CONFIGURATION =====
// Данные для автоматической загрузки на хостинг
const FTP_CONFIG = {
    enabled: true,
    host: "ftp6.hostland.ru",
    user: "host1719768_richmond",
    password: "!!110238!!", // Correct working password
    remoteDir: "vfc-charisma.ru/htdocs/www/data" // Стандартная папка для сайтов на Hostland
};
// =============================

const URLS = {
    squad: `https://cyberfootball.online/clubs/squad/${CLUB_ID}`,
    achievements: `https://cyberfootball.online/clubs/achievements/${CLUB_ID}`,
    league: `https://cyberfootball.online/tournament/table/${LEAGUE_ID}`,
    cup: `https://cyberfootball.online/tournament/table/${CUP_ID}`,
    schedule: `https://cyberfootball.online/tournament/calendar/${LEAGUE_ID}?club=${CLUB_ID}`
};

const DATA_DIR = path.join(__dirname, 'data');

async function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

async function waitForContent(page) {
    // Bypass Beget DDOS screen by running their cookie script and reloading if needed
    try {
        await page.evaluate(() => {
            if (document.body.innerText === '') {
                const script = document.querySelector('script');
                if (script && script.innerText.includes('set_cookie')) {
                    eval(script.innerText);
                }
            }
        });
    } catch (e) { }

    await page.waitForSelector('body', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
}

async function dismissPopup(page) {
    try {
        const closeBtn = await page.$('.popup-close, .modal-close, [data-dismiss="modal"], .close');
        if (closeBtn) await closeBtn.click();
        await new Promise(r => setTimeout(r, 500));
    } catch (e) { /* ignore */ }
}

async function scrapeSquad(page) {
    console.log('📋 Scraping squad...');
    await page.goto(URLS.squad, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForContent(page);
    await dismissPopup(page);

    // First, collect all player basic info and their profile links from the table
    const playersInfo = await page.evaluate(() => {
        const data = [];
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
            const trs = table.querySelectorAll('tbody tr');
            for (const tr of trs) {
                const cells = tr.querySelectorAll('td');
                if (cells.length < 3) continue;

                const nameEl = tr.querySelector('a, .player-name, td:nth-child(2)');
                const name = nameEl ? nameEl.textContent.trim() : '';
                const link = nameEl && nameEl.tagName === 'A' ? nameEl.href : null;

                if (name) {
                    const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                    data.push({
                        name: name,
                        link: link,
                        cells: cellTexts
                    });
                }
            }
        }
        return data;
    });

    if (playersInfo.length === 0) {
        return { raw: "No players found", players: [] };
    }

    console.log(`   Found ${playersInfo.length} players. Applying manual join dates...`);

    // =========================================================================
    // РУЧНАЯ НАСТРОЙКА ДАТ РЕГИСТРАЦИИ ИГРОКОВ (ДД.ММ.ГГГГ)
    // Впишите сюда актуальные даты для каждого игрока.
    // Если игрока здесь нет, будет отображаться "Неизвестно".
    // =========================================================================
    const manualDates = {
        "Rchmnd": "16.08.2024",
        "MrHoolio": "16.08.2024",
        "Istok_2503": "12.09.2024",
        // Пример добавления:
        // "Ник_Игрока": "01.01.2025",
    };

    for (const player of playersInfo) {
        let joinDate = manualDates[player.name] || "Неизвестно";

        // Append the found date (or dummy) to the cells array so the calculation works
        let baseDateStr = player.cells[0] || player.name;
        player.cells[0] = baseDateStr + ` (${joinDate})`; // Embed in first cell for the regex to catch

        // Clean up link to save space in json
        delete player.link;
    }

    return { players: playersInfo };
}

async function scrapeLeague(page) {
    console.log('🏆 Scraping league table...');
    await page.goto(URLS.league, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForContent(page);
    await dismissPopup(page);

    const league = await page.evaluate(() => {
        const titleEl = document.querySelector('h1, .tournament-title, .page-title');
        const title = titleEl ? titleEl.textContent.trim() : 'Премьер-Лига';

        const tables = document.querySelectorAll('table');
        const standings = [];

        for (const table of tables) {
            const rows = table.querySelectorAll('tbody tr');
            if (rows.length < 5) continue;

            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length < 4) continue;

                const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                const nameEl = row.querySelector('a') || cells[1];
                const teamName = nameEl ? nameEl.textContent.trim() : cellTexts[1];

                standings.push({
                    position: cellTexts[0],
                    team: teamName,
                    cells: cellTexts.slice(1)
                });
            }

            if (standings.length > 0) break;
        }

        return { title, standings };
    });

    return league;
}

async function scrapeCup(page) {
    console.log('🥊 Scraping cup data...');
    await page.goto(URLS.cup, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForContent(page);
    await dismissPopup(page);

    const cup = await page.evaluate((clubId) => {
        const titleEl = document.querySelector('h1, .tournament-title, .page-title');
        const title = titleEl ? titleEl.textContent.trim() : 'Кубок России';

        const allText = document.body.innerText;

        const matchElements = document.querySelectorAll('.match-item, .calendar-item, table.items tbody tr, .result-item');
        const matches = [];

        for (const el of matchElements) {
            const text = el.textContent.trim();
            if (text.toLowerCase().includes('charisma')) {
                matches.push(text);
            }
        }

        return { title, matches, raw: allText.substring(0, 5000) };
    }, CLUB_ID);

    return cup;
}

async function scrapeAchievements(page) {
    console.log('🎖️ Scraping achievements...');
    await page.goto(URLS.achievements, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForContent(page);
    await dismissPopup(page);

    const achievements = await page.evaluate(() => {
        // New structure uses .media objects for trophies
        const items = document.querySelectorAll('.media.push-down-20.equal-block');
        const allText = document.body.innerText;
        const data = [];

        if (items.length > 0) {
            for (const item of items) {
                const titleEl = item.querySelector('.black-head');
                const descEl = item.querySelector('.fs12');
                const imgEl = item.querySelector('.media-left img.media-object');

                const title = titleEl ? titleEl.textContent.trim() : '';
                const desc = descEl ? descEl.textContent.trim() : '';
                const iconHtml = imgEl ? `<img src="${imgEl.src}" style="max-width:50px;">` : '';

                if (title) {
                    data.push({
                        title: title.replace('Подробнее', '').trim(),
                        description: (desc || '').replace('Подробнее', '').trim(),
                        raw: '',
                        iconHtml: iconHtml
                    });
                }
            }
        }

        // Fallback for legacy items or unexpected structure
        if (data.length === 0) {
            const legacyItems = document.querySelectorAll('.col-lg-2.col-md-3.col-sm-4.col-6, .achievement-item, .trophy-item, .award-item');
            if (legacyItems.length > 0) {
                for (const item of legacyItems) {
                    if (item.innerText.trim().length < 5) continue;
                    const textLines = item.innerText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
                    let title = item.querySelector('h3, h4, h5, .title, .name, strong, b')?.textContent.trim() || textLines[0];
                    let desc = item.querySelector('p, .desc, .description, span.text-muted')?.textContent.trim() || (textLines.length > 1 ? textLines.slice(1).join(' ') : '');
                    if (title && !title.toLowerCase().includes('подробнее')) {
                        let iconHtml = item.querySelector('img') ? `<img src="${item.querySelector('img').src}" style="max-width:50px;">` : '';
                        data.push({
                            title: title.replace('Подробнее', '').trim(),
                            description: (desc || '').replace('Подробнее', '').trim(),
                            raw: '',
                            iconHtml: iconHtml
                        });
                    }
                }
            }
        }

        return { achievements: data, raw: allText.substring(0, 5000) };
    });

    return achievements;
}

async function scrapeSchedule(page) {
    console.log('📅 Scraping schedule...');
    await page.goto(URLS.schedule, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitForContent(page);
    await dismissPopup(page);

    const schedule = await page.evaluate(() => {
        const matches = [];
        const table = document.querySelector('table.table');

        if (!table) return { matches: [] };

        const children = Array.from(table.children);
        let currentRound = '';

        children.forEach(el => {
            if (el.tagName === 'THEAD') {
                const head = el.querySelector('.black-head, th');
                if (head) currentRound = head.textContent.trim();
            }
            else if (el.tagName === 'TBODY') {
                const rows = el.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 5) {
                        const date = cells[0]?.textContent.trim();
                        const homeTeam = cells[2]?.textContent.trim();
                        const score = cells[3]?.textContent.trim();
                        const awayTeam = cells[4]?.textContent.trim();

                        if (homeTeam && awayTeam) {
                            matches.push({
                                round: currentRound,
                                date: date,
                                home: homeTeam,
                                away: awayTeam,
                                score: score
                            });
                        }
                    }
                });
            }
        });

        return { matches };
    });

    return schedule;
}

async function main() {
    await ensureDataDir();

    console.log('🚀 Starting CHARISMA data update...\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        console.log('🌐 Browser launched, opening page...');
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        // Переключаем язык на русский через системную ссылку
        console.log('🇷🇺 Setting language to Russian...');
        await page.goto('https://cyberfootball.online/arena/language?s=ru', { waitUntil: 'networkidle2' });

        const squadData = await scrapeSquad(page);
        const leagueData = await scrapeLeague(page);
        const cupData = await scrapeCup(page);
        const achievementsData = await scrapeAchievements(page);
        const scheduleData = await scrapeSchedule(page);

        const timestamp = new Date().toISOString();

        // We already augmented squad with avatars via download-avatars.js, 
        // to avoid overwriting avatars, let's keep the existing `data/squad.json` avatar field if it exists
        let existingSquad = {};
        const squadPath = path.join(DATA_DIR, 'squad.json');
        if (fs.existsSync(squadPath)) {
            existingSquad = JSON.parse(fs.readFileSync(squadPath, 'utf8'));
        }

        if (squadData.players && existingSquad.players) {
            for (let p of squadData.players) {
                const match = existingSquad.players.find(ep => ep.name === p.name);
                if (match && match.avatar) {
                    p.avatar = match.avatar;
                }
            }
        }

        fs.writeFileSync(
            squadPath,
            JSON.stringify({ updated: timestamp, ...squadData }, null, 2)
        );

        fs.writeFileSync(
            path.join(DATA_DIR, 'league.json'),
            JSON.stringify({ updated: timestamp, ...leagueData }, null, 2)
        );


        // Preserve cup matches if scraper returns empty array
        let existingCup = {};
        const cupPath = path.join(DATA_DIR, 'cup.json');
        if (fs.existsSync(cupPath)) {
            existingCup = JSON.parse(fs.readFileSync(cupPath, 'utf8'));
        }
        if (cupData.matches && cupData.matches.length === 0 && existingCup.matches && existingCup.matches.length > 0) {
            cupData.matches = existingCup.matches;
        }

        fs.writeFileSync(
            cupPath,
            JSON.stringify({ updated: timestamp, ...cupData }, null, 2)
        );

        fs.writeFileSync(
            path.join(DATA_DIR, 'achievements.json'),
            JSON.stringify({ updated: timestamp, ...achievementsData }, null, 2)
        );

        fs.writeFileSync(
            path.join(DATA_DIR, 'schedule.json'),
            JSON.stringify({ updated: timestamp, ...scheduleData }, null, 2)
        );

        console.log('\n✅ Data updated successfully!');
        console.log(`   📁 Files saved to: ${DATA_DIR}`);
        console.log(`   ⏰ Timestamp: ${timestamp}`);

        // ===== FTP UPLOAD =====
        if (FTP_CONFIG.enabled) {
            console.log('\n🚀 Starting FTP upload to Hostland...');
            const { execSync } = require('child_process');
            try {
                const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
                const remoteBase = `ftp://${FTP_CONFIG.user}:${FTP_CONFIG.password}@${FTP_CONFIG.host}/${FTP_CONFIG.remoteDir}/`;

                for (const file of files) {
                    process.stdout.write(`   Uploading ${file}... `);
                    const localFile = path.join(DATA_DIR, file);
                    const remoteUrl = remoteBase + file;
                    // Утилита curl в Windows загружает файлы гораздо надежнее базового FTP
                    // Используем curl.exe в Windows и просто curl в Linux/Mac
                    const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
                    // Убираем stdio: 'ignore', чтобы видеть ошибки если они есть
                    execSync(`${curlCmd} -s -S --ftp-create-dirs -T "${localFile}" "${remoteUrl}"`, { stdio: 'inherit' });
                    console.log('✅ Done');
                }
                console.log('\n✨ All files uploaded to server successfully!');
            } catch (err) {
                console.error('\n❌ FTP Upload Error Details:');
                console.error(err.message);
                if (err.stdout) console.error('Stdout:', err.stdout.toString());
                if (err.stderr) console.error('Stderr:', err.stderr.toString());
                console.log('   Check your FTP_CONFIG in update-data.js');
                process.exit(1);
            }
        } else {
            console.log('\nℹ️  FTP upload skipped (FTP_CONFIG.enabled is false)');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

main();
