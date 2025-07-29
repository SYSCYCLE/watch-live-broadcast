// client.js
const baslatBtn = document.getElementById('baslatBtn');
const videoPreview = document.getElementById('videoPreview');
const durum = document.getElementById('durum');

let mediaRecorder;
let videoStream;

baslatBtn.addEventListener('click', async () => {
    try {
        // 1. Kullanıcıdan kamera izni iste
        // Sadece ön kamerayı istemek için: { video: { facingMode: 'user' }, audio: false }
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

        // Kameradan gelen görüntüyü <video> elementinde göster
        videoPreview.srcObject = videoStream;
        durum.textContent = "Kamera erişimi başarılı. Kayıt başlatılıyor...";
        baslatBtn.disabled = true;

        // 2. MediaRecorder'ı ayarla
        mediaRecorder = new MediaRecorder(videoStream, { mimeType: 'video/webm' });

        // Kayıt başladığında yapılacaklar
        mediaRecorder.onstart = () => {
            console.log('Kayıt başladı.');
        };

        // Kayıt durduğunda (her 10 saniyede bir) video verisiyle ne yapacağımızı belirle
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                console.log('10 saniyelik veri mevcut, sunucuya gönderiliyor...');
                // Kaydedilen video parçasını (Blob) sunucuya gönder
                sunucuyaGonder(event.data);
            }
        };

        // Her 10 saniyede bir kaydı durdurup yeniden başlatacak döngüyü kur
        setInterval(() => {
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop(); // Bu, ondataavailable olayını tetikler
            }
            mediaRecorder.start(); // Ve hemen yenisini başlatır
        }, 10000); // 10000 milisaniye = 10 saniye

        // İlk kaydı hemen başlat
        mediaRecorder.start();

    } catch (err) {
        console.error("Kamera erişim hatası:", err);
        durum.textContent = "Kamera erişimi reddedildi veya bir hata oluştu.";
    }
});

function sunucuyaGonder(videoParcasi) {
    const formData = new FormData();
    // 'video' anahtarı, sunucudaki upload.single('video') ile eşleşmeli
    // 'kayit.webm' dosya ismidir, sunucuda zaten yeniden isimlendirilecek.
    formData.append('video', videoParcasi, 'kayit.webm');

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Sunucudan gelen yanıt:', data.message);
        durum.textContent = "Son 10 saniye başarıyla kaydedildi.";
    })
    .catch(err => {
        console.error('Yükleme hatası:', err);
        durum.textContent = "Kayıt sunucuya yüklenirken hata oluştu.";
    });
}
