# Soner İpek Erkek Kuaförü — GitHub Pages + Supabase

Bu sürüm Node.js gerektirmez. Site GitHub Pages üzerinde, randevular ve berber paneli Supabase üzerinde çalışır.

## Dosyalar
- `public/index.html` — ana site
- `public/panel.html` — berber paneli
- `public/app.js` — arayüz ve randevu işlemleri
- `public/api.js` — Supabase veri katmanı
- `public/config.js` — Supabase URL/publishable key ve dükkan ayarları
- `public/style.css` — tasarım

## GitHub Pages
GitHub Pages kaynak klasörü olarak `public` seçilirse site doğrudan yayınlanır.

Ana site: `.../index.html`
Panel: `.../panel.html`

## Panel
Varsayılan panel şifresi: `soner123`

## Supabase
Randevular `bookings`, kapatılan saatler `blocks` tablolarında tutulur. Eski `server.js` ve JSON veritabanı kullanılmaz.
