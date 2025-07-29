const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Yüklenen dosyaların kaydedileceği klasörü kontrol et/oluştur
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer yapılandırması: Dosyaları nereye ve hangi isimle kaydedeceğimizi belirtir
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Dosyaları 'uploads' klasörüne kaydet
    },
    filename: function (req, file, cb) {
        // Her video parçası için benzersiz bir isim oluştur
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'kayit-' + uniqueSuffix + '.webm');
    }
});

const upload = multer({ storage: storage });

// Frontend dosyalarını (HTML, JS, CSS) sunmak için 'public' klasörünü kullan
app.use(express.static('public'));

// Video parçasını yüklemek için API rotası (endpoint)
app.post('/upload', upload.single('video'), (req, res) => {
    if (req.file) {
        console.log('Video parçası başarıyla kaydedildi:', req.file.filename);
        res.status(200).send({ message: 'Parça başarıyla yüklendi.' });
    } else {
        res.status(400).send({ message: 'Dosya yüklenemedi.' });
    }
});

app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});
