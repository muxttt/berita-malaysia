# Berita Malaysia Terkini

Laman web statik (PWA) yang mengumpulkan berita Malaysia daripada pelbagai sumber RSS.

## Ciri-ciri
- Agregat berita dari Bernama, The Star, Malaysiakini, FMT, dan lain-lain
- **Halaman kategori**: Politik, Ekonomi, Sukan, Hiburan, Teknologi, Dunia, Jenayah
- **PWA**: boleh dipasang di telefon, ada ikon, splash screen, dan berfungsi offline (aset statik)
- Tapisan ikut bahasa (BM / EN / ZH) dan sumber
- Carian tajuk & ringkasan
- Tema cerah / gelap
- Cache 15 minit (localStorage)
- Routing hash (boleh kongsi pautan kategori, cth `#/politik`)

## Cara deploy ke GitHub Pages

1. Cipta repositori baru di GitHub, contohnya `berita-malaysia`.
2. Upload semua fail:
   - `index.html`
   - `style.css`
   - `app.js`
   - `manifest.json`
   - `service-worker.js`
   - `icon.svg`
   - `.nojekyll`
   - `README.md`
3. Pergi ke **Settings → Pages**.
4. Di bahagian **Source**, pilih:
   - Branch: `main`
   - Folder: `/ (root)`
5. Klik **Save**. Laman akan tersedia di:
   `https://<username>.github.io/berita-malaysia/`

## Nota PWA
- PWA hanya aktif melalui HTTPS (GitHub Pages sudah HTTPS).
- Untuk cuba "Pasang", buka laman di Chrome/Edge desktop atau Android.
- iOS Safari: kongsi → "Add to Home Screen".
- Ikon PWA menggunakan SVG. Kalau mahu PNG untuk keserasian maksimum,
  tukar `icon.svg` kepada `icon-192.png` + `icon-512.png` dan kemas kini
  `manifest.json`.

## Cara tambah sumber berita
Edit senarai `SUMBER_BERITA` dalam `app.js`:
```js
{ nama: "Nama Sumber", url: "https://.../rss", bahasa: "BM" }