const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process'); // Sunucudan komut çalıştırmak için

const app = express();
const port = process.env.PORT || 3000;

// Yüklenen dosyalar için uploads klasörünü oluştur
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer'ı dosyaları diske kaydedecek şekilde ayarla
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'kayit-' + uniqueSuffix + '.webm');
    }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));

// GitHub'a push yapan fonksiyon (TEHLİKELİ VE TAVSİYE EDİLMEZ)
function pushToGithub(filename) {
    // Render'a eklediğimiz token'ı burada yakalıyoruz
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 
    
    // !!! BURAYI KENDİ BİLGİLERİNİZLE DEĞİŞTİRİN !!!
    const REPO_URL = 'github.com/SYSCYCLE/watch-live-broadcast'; // GitHub Kullanıcı Adınız / Repo Adınız

    if (!GITHUB_TOKEN) {
        console.error('HATA: GITHUB_TOKEN ortam değişkeni bulunamadı!');
        return;
    }

    // Sırasıyla çalıştırılacak Git komutları
    const commands = [
        'git config --global user.email "bot@render.com"',
        'git config --global user.name "Render Bot"',
        'git pull', // Olası çakışmaları önlemek için önce en son halini çek
        `git add uploads/${filename}`, // Sadece yeni gelen dosyayı ekle
        `git commit -m "Yeni video yüklendi: ${filename}"`, // Commit at
        `git push https://${GITHUB_TOKEN}@${REPO_URL}` // Token ile push yap
    ].join(' && ');

    exec(commands, (error, stdout, stderr) => {
        if (error) {
            console.error(`Git Hatası: ${error.message}`);
            return;
        }
        if (stderr) {
            // stderr'de bazen normal çıktılar da olabilir, dikkatli loglayın
            console.error(`Git Stderr: ${stderr}`);
            return;
        }
        console.log(`Git Stdout: ${stdout}`);
        console.log(`${filename} başarıyla GitHub'a gönderildi.`);
    });
}


app.post('/upload', upload.single('video'), (req, res) => {
    if (req.file) {
        console.log('Video parçası başarıyla sunucuya kaydedildi:', req.file.filename);
        
        // Kaydedilen dosyayı GitHub'a gönderme fonksiyonunu çağır
        pushToGithub(req.file.filename);

        res.status(200).send({ message: 'Parça başarıyla yüklendi.' });
    } else {
        res.status(400).send({ message: 'Dosya yüklenemedi.' });
    }
});

app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});
