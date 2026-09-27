export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  const subId = host.split('.')[0];

  if (!subId || subId === 'localhost' || subId === 'vercel') {
    return res.redirect(302, '/admin.html');
  }

  try {
    // URL CSV Publik dari Google Sheets Anda
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQty5Cfk38iLp1fHwLWMUk9Leri1EJcppHrfRmhCvxtWbysft4jMvaVhOB4K_YxZV3zDKBI6_7pqlcZ/pub?gid=0&single=true&output=csv';

    const response = await fetch(csvUrl);
    const csvText = await response.text();

    // Parse CSV sederhana baris per baris
    const rows = csvText.split('\n').map(row => {
      // Mengatasi koma di dalam teks jika ada
      return row.split(',').map(val => val.trim().replace(/^["']|["']$/g, ''));
    });

    if (!rows || rows.length < 2) {
      return res.status(404).send('Database CSV kosong.');
    }

    const headers = rows[0]; // ['id', 'nama_lokasi', 'gmaps_url', 'image_url', 'status', 'kategori']
    const dataRows = rows.slice(1);

    // Cari baris yang kolom 'id'-nya cocok dengan subdomain
    const matchedRow = dataRows.find(row => row[0] && row[0].toLowerCase() === subId.toLowerCase());

    if (!matchedRow) {
      return res.status(404).send(`ID QR / Subdomain "${subId}" tidak ditemukan.`);
    }

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
    return res.status(500).send('Terjadi kesalahan saat membaca data CSV.');
  }
}