const fs = require('fs');
const https = require('https');
const path = require('path');

const avatars = {
    "Istok_2503": "https://cyberfootball.online/cdn/avatars/small/9b06273ab8289ee08a33photo_2026-02-02_18-33-47.png",
    "MrHoolio": "https://cyberfootball.online/cdn/avatars/small/e3efeb9d8b8fde61d58bstill_2026-01-31_135628_2_1_1_1_.png",
    "x 6y6cuk x": "https://cyberfootball.online/cdn/avatars/small/e7c724ce234df362f147still_2026-01-31_141450_2_1_4_1_.png",
    "Wes_CapMorgan": "https://cyberfootball.online/cdn/avatars/small/deac24d01aa969c09201p50467761_1_.png",
    "Kolobaxa": "https://cyberfootball.online/cdn/avatars/small/bade1893efcfe1099da91-84-128b.png",
    "kirukhapro": "https://cyberfootball.online/cdn/avatars/small/db8fd501a86c093d3f03_13.png",
    "x-wh1ty-_-I0": "https://cyberfootball.online/cdn/avatars/small/5520d3f8f867e2ee245bpng_santos_1_1_.png",
    "lily60mili": "https://cyberfootball.online/cdn/avatars/small/2951a0e688091f8d5433photo-output.png",
    "Rchmnd": "https://cyberfootball.online/cdn/avatars/small/f04c3cd67df0c604d1cfrich-rich-rich1.png",
    "F4llenbtw": "https://cyberfootball.online/cdn/core/user-nologo.png",
    "Butyash": "https://cyberfootball.online/cdn/avatars/small/d18b1f37c728fb523c3a_1.png",
    "Belarussianhope": "https://cyberfootball.online/cdn/avatars/small/c1a11c47d1273d73feb0212222.png",
    "DeS-Tasted_": "https://cyberfootball.online/cdn/avatars/small/46f3b45e1fa05a25f11dphoto_2026-02-02_16-37-24.png",
    "Abdulaevvv05": "https://cyberfootball.online/cdn/avatars/small/f6682565106c94a9e769img_8789.jpeg"
};

const dir = path.join(__dirname, 'assets', 'avatars');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const squadDataPath = path.join(__dirname, 'data', 'squad.json');
let squadData = JSON.parse(fs.readFileSync(squadDataPath, 'utf8'));

async function downloadAvatar(name, url) {
    return new Promise((resolve, reject) => {
        const ext = path.extname(url).split('?')[0] || '.png';
        const safeName = name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        const filename = `${safeName}${ext}`;
        const filepath = path.join(dir, filename);

        const file = fs.createWriteStream(filepath);
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }, function (response) {
            if (response.statusCode !== 200) {
                console.log(`Failed to load ${url}: ${response.statusCode}`);
                return resolve(null);
            }
            response.pipe(file);
            file.on('finish', function () {
                file.close(() => resolve(`assets/avatars/${filename}`));
            });
        }).on('error', function (err) {
            fs.unlink(filepath, () => { });
            reject(err);
        });
    });
}

async function run() {
    for (let player of squadData.players) {
        if (avatars[player.name]) {
            console.log(`Downloading avatar for ${player.name}...`);
            const localPath = await downloadAvatar(player.name, avatars[player.name]);
            if (localPath) {
                player.avatar = localPath;
            }
        }
    }
    fs.writeFileSync(squadDataPath, JSON.stringify(squadData, null, 2));
    console.log("✅ Done updating squad.json with local avatars");
}

run();
