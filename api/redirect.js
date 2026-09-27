export default async function handler(req, res) {
  // Ambil URL lengkap termasuk query string dari request
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const fullUrl = `${protocol}://${req.headers.host}${req.url}`;
  const parsedUrl = new URL(fullUrl);
  
  // Cek apakah ada parameter ?id=... di URL
  let subId = parsedUrl.searchParams.get('id');

  // Jika tidak ada parameter ?id=, coba ambil dari subdomain (untuk penggunaan asli nanti)
  if (!subId) {
    const host = req.headers['host'] || '';
    const parts = host.split('.');
    if (host.includes('vercel.app') || host.includes('localhost')) {
      subId = 'admin';
    } else {
      subId = parts[0];
    }
  }

  if (subId === 'admin' || !subId) {
    return res.redirect(302, '/admin.html');
  }

  try {
    // Link CSV publik dari Google Sheets Anda
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQty5Cfk38iLp1fHwLWMUk9Leri1EJcppHrfRmhCvxtWbysft4jMvaVhOB4K_YxZV3zDKBI6_7pqlcZ/pub?gid=0&single=true&output=csv';

    const response = await fetch(csvUrl);
    const csvText = await response.text();

    const rows = csvText.split('\n').map(row => {
      return row.split(',').map(val => val.trim().replace(/^["']|["']$/g, ''));
    });

    if (!rows || rows.length < 2) {
      return res.status(404).send('Database CSV kosong.');
    }

    const dataRows = rows.slice(1);
    // Cocokkan dengan kolom 'id' (indeks 0) dari spreadsheet
    const matchedRow = dataRows.find(row => row[0] && row[0].toLowerCase() === subId.toLowerCase());

    if (!matchedRow) {
      return res.status(404).send(`ID QR / Subdomain "${subId}" tidak ditemukan dalam database.`);
    }

    const [id, nama_lokasi, gmaps_url, image_url, status, kategori] = matchedRow;

    if (status && status.toLowerCase() !== 'active') {
      return res.status(403).send('QR Code ini sedang dinonaktifkan.');
    }

    // Jika kategori bisnis, langsung redirect ke gmaps_url
    if (kategori && kategori.toLowerCase() === 'bisnis') {
      return res.redirect(302, gmaps_url);
    }

    // Jika non-bisnis, lempar ke halaman sponsor dengan jeda 3 detik
    const encodedTarget = encodeURIComponent(gmaps_url);
    const encodedImage = encodeURIComponent(image_url || '');
    return res.redirect(302, `/sponsor.html?target=${encodedTarget}&img=${encodedImage}`);

  } catch (error) {
    console.error(error);
    return res.status(500).send('Terjadi kesalahan saat membaca data CSV.');
  }
}