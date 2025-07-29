const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// --- GÜVENLİ ŞİFRELEME AYARLARI ---
// Şifreyi Render'daki Environment Variables'dan (güvenli kasadan) alıyoruz.
const PASSWORD = process.env.ENCRYPTION_PASSWORD;
const ALGORITHM = 'aes-256-cbc';

// Şifre kasada tanımlı değilse, sunucuyu hata vererek durdur. Bu bir güvenlik önlemidir.
if (!PASSWORD) {
    console.error("KRİTİK HATA: ENCRYPTION_PASSWORD ortam değişkeni bulunamadı!");
    process.exit(1); 
}

const KEY = crypto.createHash('sha256').update(String(PASSWORD)).digest('base64').substr(0, 32);
const IV_LENGTH = 16;

function encrypt(buffer) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
}
// --- /GÜVENLİ ŞİFRELEME AYARLARI ---


const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));

function pushToGithub(filename) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_URL = 'github.com/SYSCYCLE/watch-live-broadcast';

    if (!GITHUB_TOKEN) {
        console.error('HATA: GITHUB_TOKEN ortam değişkeni bulunamadı!');
        return;
    }

    const commands = [
        'git config --global user.email "bot@render.com"',
        'git config --global user.name "Render Bot"',
        'git pull',
        `git add uploads/${filename}`,
        `git commit -m "Yeni şifreli kayıt eklendi: ${filename}"`,
        `git push https://${GITHUB_TOKEN}@${REPO_URL}`
    ].join(' && ');

    exec(commands, (error, stdout, stderr) => {
        if (error) { console.error(`Git Hatası: ${error.message}`); return; }
        if (stderr) { console.error(`Git Stderr: ${stderr}`); return; }
        console.log(`${filename} başarıyla GitHub'a gönderildi.`);
    });
}

app.post('/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'Dosya yüklenemedi.' });
    }
    
    const encryptedVideo = encrypt(req.file.buffer);
    const encryptedFilename = `kayit-${Date.now()}.webm.enc`;
    const encryptedFilePath = path.join(uploadsDir, encryptedFilename);

    fs.writeFile(encryptedFilePath, encryptedVideo, (err) => {
        if (err) {
            console.error('Şifreli dosya yazma hatası:', err);
            return res.status(500).send({ message: 'Dosya işlenirken hata oluştu.' });
        }

        console.log('Video başarıyla şifrelendi:', encryptedFilename);
        pushToGithub(encryptedFilename);
        res.status(200).send({ message: 'Parça başarıyla şifrelenip yüklendi.' });
    });
});

app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});
