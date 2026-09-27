const { google } = require('googleapis');

// Ganti dengan Spreadsheet ID Anda
const SPREADSHEET_ID = '1EVqMj-V9Y6r0fclkk7tyVQB8Co9fQ1JEmsAhcTXXGVM'; 

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  const subId = host.split('.')[0];

  if (!subId || subId === 'localhost' || subId === 'vercel') {
    return res.redirect(302, '/admin.html');
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Membaca kolom A sampai F sesuai struktur Google Sheets Anda
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:F',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return res.status(404).send('Database spreadsheet kosong.');
    }

    const dataRows = rows.slice(1);
    const matchedRow = dataRows.find(row => row[0] && row[0].trim().toLowerCase() === subId.toLowerCase());

    if (!matchedRow) {
      return res.status(404).send(`ID QR / Subdomain "${subId}" tidak ditemukan.`);
    }

    // Urutan kolom: [id, nama_lokasi, gmaps_url, image_url, status, kategori]
    const [id, nama_lokasi, gmaps_url, image_url, status, kategori] = matchedRow;

    if (status && status.toLowerCase() !== 'active') {
      return res.status(403).send('QR Code ini sedang dinonaktifkan.');
    }

    // Jika kategori bisnis, langsung redirect ke Google Maps
    if (kategori && kategori.toLowerCase() === 'bisnis') {
      return res.redirect(302, gmaps_url);
    }

    // Jika non-bisnis, lempar ke halaman sponsor dengan jeda 3 detik
    const encodedTarget = encodeURIComponent(gmaps_url);
    const encodedImage = encodeURIComponent(image_url || '');
    return res.redirect(302, `/sponsor.html?target=${encodedTarget}&img=${encodedImage}`);

  } catch (error) {
    console.error(error);
    return res.status(500).send('Terjadi kesalahan server saat membaca database.');
  }
}