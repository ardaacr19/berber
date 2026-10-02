const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATA_FILE = path.join(__dirname, 'appointments.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
function authorized(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ') || !ADMIN_PASSWORD) return false;
  let credentials;
  try { credentials = Buffer.from(header.slice(6), 'base64').toString(); } catch { return false; }
  const split = credentials.indexOf(':');
  if (split < 0) return false;
  const user = Buffer.from(credentials.slice(0, split));
  const pass = Buffer.from(credentials.slice(split + 1));
  const expectedUser = Buffer.from(ADMIN_USER);
  const expectedPass = Buffer.from(ADMIN_PASSWORD);
  return user.length === expectedUser.length && pass.length === expectedPass.length && crypto.timingSafeEqual(user, expectedUser) && crypto.timingSafeEqual(pass, expectedPass);
}
function requireAdmin(req, res) {
  if (authorized(req)) return true;
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Makas Admin", charset="UTF-8"', 'Cache-Control': 'no-store' });
  res.end('Yönetici girişi gerekli.');
  return false;
}
function getAppointments() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
function saveAppointments(items) {
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(items, null, 2), { mode: 0o600 });
  fs.renameSync(temp, DATA_FILE);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 16000) reject(new Error('İstek çok büyük.')); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Geçersiz form verisi.')); } });
    req.on('error', reject);
  });
}
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'POST' && pathname === '/api/appointments') {
    try {
      const form = await readBody(req);
      const name = String(form.name || '').trim().slice(0, 100);
      const phone = String(form.phone || '').trim().slice(0, 40);
      const service = String(form.service || '').trim().slice(0, 100);
      const date = String(form.date || '');
      const time = String(form.time || '');
      const email = String(form.email || '').trim().slice(0, 150);
      const note = String(form.note || '').trim().slice(0, 1000);
      if (!name || !phone || !service || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return send(res, 400, { error: 'Lütfen zorunlu alanları kontrol edin.' });
      if (date < new Date().toISOString().slice(0, 10)) return send(res, 400, { error: 'Geçmiş bir tarih seçemezsiniz.' });
      const appointments = getAppointments();
      const appointment = { id: crypto.randomUUID(), name, phone, service, date, time, email, note, status: 'Yeni', createdAt: new Date().toISOString() };
      appointments.push(appointment);
      saveAppointments(appointments);
      return send(res, 201, { ok: true, id: appointment.id });
    } catch (error) { return send(res, 400, { error: error.message || 'Randevu kaydedilemedi.' }); }
  }
  if (pathname.startsWith('/api/admin/')) {
    if (!requireAdmin(req, res)) return;
    if (req.method === 'GET' && pathname === '/api/admin/appointments') return send(res, 200, getAppointments().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    const statusMatch = pathname.match(/^\/api\/admin\/appointments\/([\w-]+)$/);
    if (req.method === 'PATCH' && statusMatch) {
      try {
        const body = await readBody(req);
        if (!['Yeni', 'Onaylandı', 'Tamamlandı', 'İptal edildi'].includes(body.status)) return send(res, 400, { error: 'Geçersiz durum.' });
        const appointments = getAppointments();
        const appointment = appointments.find(item => item.id === statusMatch[1]);
        if (!appointment) return send(res, 404, { error: 'Randevu bulunamadı.' });
        appointment.status = body.status;
        saveAppointments(appointments);
        return send(res, 200, { ok: true });
      } catch { return send(res, 400, { error: 'İstek işlenemedi.' }); }
    }
    return send(res, 404, { error: 'Bulunamadı.' });
  }
  if (req.method !== 'GET') return send(res, 405, { error: 'Bu yöntem desteklenmiyor.' });
  let file = pathname === '/' ? 'index.html' : pathname === '/admin' || pathname === '/admin/' ? 'admin.html' : pathname.slice(1);
  if (file === 'admin.html' && !requireAdmin(req, res)) return;
  const resolved = path.resolve(__dirname, file);
  if (!resolved.startsWith(`${__dirname}${path.sep}`)) return send(res, 403, { error: 'Erişim reddedildi.' });
  fs.readFile(resolved, (error, contents) => {
    if (error) return send(res, 404, { error: 'Sayfa bulunamadı.' });
    return send(res, 200, contents, MIME[path.extname(resolved)] || 'application/octet-stream');
  });
});

if (!ADMIN_PASSWORD) {
  console.error('Başlatmadan önce ADMIN_PASSWORD ortam değişkenini belirleyin.');
  process.exit(1);
}
server.listen(PORT, () => console.log(`MAKAS sitesi çalışıyor: http://localhost:${PORT} (admin: /admin)`));
