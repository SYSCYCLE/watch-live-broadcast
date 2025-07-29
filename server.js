const express = require('express');
const multer =require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// --- GÜVENLİ ŞİFRELEME AYARLARI ---
const PASSWORD = process.env.ENCRYPTION_PASSWORD;
const ALGORITHM = 'aes-256-cbc';

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


// === DÜZELTİLMİŞ ve KESİN ÇÖZÜM ===
function pushToGithub(filename) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_URL = 'github.com/SYSCYCLE/watch-live-broadcast.git'; 

    if (!GITHUB_TOKEN) {
        console.error('HATA: GITHUB_TOKEN ortam değişkeni bulunamadı!');
        return;
    }

    // Sorunlu 'git pull' ve 'config' komutları tamamen kaldırıldı.
    // 'push' komutuna hangi dala gideceği açıkça belirtildi: 'HEAD:main'
    const commands = [
        // Commit için kullanıcı bilgisi eklemek yine de iyi bir pratiktir, ama global olmadan.
        'git config user.email "bot@render.com"',
        'git config user.name "Render Bot"',
        `git add uploads/${filename}`,
        `git commit -m "Yeni şifreli kayıt eklendi: ${filename}"`, 
        // EN ÖNEMLİ DEĞİŞİKLİK BURADA: 'HEAD:main' ekledik.
        `git push https://${GITHUB_TOKEN}@${REPO_URL} HEAD:main`
    ].join(' && ');

    console.log("Çalıştırılacak Son Komut:", commands);

    exec(commands, (error, stdout, stderr) => {
        if (error) {
            console.error(`Git Hatasının Tam Detayı: ${error.message}`);
            console.error(`Stderr (hata çıktısı): ${stderr}`);
            return;
        }
        console.log(`${filename} başarıyla GitHub'a gönderildi. Çıktı: ${stdout}`);
    });
}
// === /DÜZELTİLMİŞ ve KESİN ÇÖZÜM ===


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
