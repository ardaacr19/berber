# MAKAS Berber

## Yerel olarak çalıştırma

Node.js 18 veya üzeri gerekir. PowerShell'de proje klasöründe:

```powershell
$env:ADMIN_PASSWORD = "berber123"
$env:ADMIN_USER = "admin"
node server.js
```

Site: http://localhost:3000  
Yönetim paneli: http://localhost:3000/admin

Admin paneli `ADMIN_USER` ve `ADMIN_PASSWORD` ile HTTP Basic Auth kullanır. Randevular proje klasöründe `appointments.json` dosyasına kaydedilir. Bu dosya ilk randevu geldiğinde oluşturulur. Sunucuyu internete açacaksanız HTTPS kullanan bir sunucuya dağıtın ve güçlü admin parolası belirleyin.

Admin ekranı yeni randevuları 15 saniyede bir kontrol eder. Tarayıcı bildirimleri destekleniyorsa izin verildikten sonra yeni talep bildirimi de gösterir.
