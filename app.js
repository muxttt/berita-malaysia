/* =========================================================
   Berita Malaysia Aggregator + PWA + Kategori
   ========================================================= */

/* ---------- 1. KONFIGURASI SUMBER ---------- */
const SUMBER_BERITA = [
  { nama: "Bernama",      url: "https://www.bernama.com/bm/rssfeed.php",         bahasa: "BM" },
  { nama: "Astro Awani",  url: "https://www.astroawani.com/rss/berita-malaysia", bahasa: "BM" },
  { nama: "Sinar Harian", url: "https://www.sinarharian.com.my/rss",             bahasa: "BM" },
  { nama: "Harian Metro", url: "https://www.hmetro.com.my/rss",                  bahasa: "BM" },
  { nama: "The Star",     url: "https://www.thestar.com.my/rss/News/Nation",     bahasa: "EN" },
  { nama: "Malaysiakini", url: "https://www.malaysiakini.com/rss/news.rss",      bahasa: "EN" },
  { nama: "FMT",          url: "https://www.freemalaysiatoday.com/feed/",        bahasa: "EN" },
  { nama: "Malay Mail",   url: "https://www.malaymail.com/feed/rss",             bahasa: "EN" },
  { nama: "Sin Chew",     url: "https://www.sinchew.com.my/feed/",               bahasa: "ZH" }
];

const HAD_PER_SUMBER = 12;
const TTL_CACHE = 15 * 60 * 1000;
const KEY_CACHE = "berita_my_cache_v2";
const KEY_TEMA  = "berita_my_tema";

/* ---------- 2. KATEGORI ---------- */
const KATEGORI = [
  { id: "semua",     nama: "Semua",     ikon: "📰" },
  { id: "politik",   nama: "Politik",   ikon: "🏛️" },
  { id: "ekonomi",   nama: "Ekonomi",   ikon: "💹" },
  { id: "sukan",     nama: "Sukan",     ikon: "⚽" },
  { id: "hiburan",   nama: "Hiburan",   ikon: "🎬" },
  { id: "teknologi", nama: "Teknologi", ikon: "💻" },
  { id: "dunia",     nama: "Dunia",     ikon: "🌍" },
  { id: "jenayah",   nama: "Jenayah",   ikon: "🚨" }
];

const KATA_KUNCI = {
  politik: [
    "politik", "parlimen", "menteri", "kerajaan", "pembangkang", "pilihan raya",
    "pru", "dap", "umno", "pkr", "pas", "bersatu", "amanah", "anwar", "mahathir",
    "muhyiddin", "zahid", "election", "parliament", "minister", "government",
    "opposition", "political", "policy", "cabinet", "dun", "wakil rakyat",
    "kabinet", "perdana menteri", "pm ", "mp "
  ],
  ekonomi: [
    "ekonomi", "kewangan", "saham", "bursa", "ringgit", "pelaburan", "bank",
    "cukai", "inflasi", "gdp", "dagang", "bisnes", "perniagaan", "economy",
    "finance", "financial", "stock", "trade", "investment", "market", "business",
    "subsidi", "harga", "gaji", "minimum", "belanjawan", "budget"
  ],
  sukan: [
    "sukan", "bola sepak", "badminton", "hoki", "olimpik", "piala", "liga",
    "pemain", "jurulatih", "sport", "football", "league", "olympic", "match",
    "player", "coach", "mfl", "fam", "sepak", "atlet", "kejohanan",
    "badminton", "shuttler", "world cup", "piala dunia"
  ],
  hiburan: [
    "hiburan", "artis", "pelakon", "penyanyi", "filem", "drama", "konsert",
    "muzik", "entertainment", "celebrity", "actor", "singer", "movie",
    "concert", "music", "artist", "wayang", "anugerah", "drama", "sinetron"
  ],
  teknologi: [
    "teknologi", "digital", "ai", "kecerdasan buatan", "siber", "komputer",
    "telefon", "internet", "gadget", "tech", "cyber", "smartphone", "software",
    "aplikasi", "5g", "data", "startup", "kod", "robot"
  ],
  dunia: [
    "dunia", "antarabangsa", "global", "luar negara", "world", "international",
    "foreign", "asing", "amerika", "china", "indonesia", "singapura", "eropah",
    "timur tengah", "israel", "palestin", "ukraine", "rusia", "trump", "biden"
  ],
  jenayah: [
    "jenayah", "polis", "tangkap", "mahkamah", "rasuah", "curi", "rompak",
    "bunuh", "samun", "dadah", "crime", "police", "arrest", "court",
    "corruption", "theft", "murder", "drug", "saman", "tahan", "suspek",
    "terdakwa", "hukuman", "penjara"
  ]
};

/* ---------- 3. PROXY ---------- */
const PROXIES = [
  {
    nama: "rss2json",
    bina: (url) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`,
    jenis: "json"
  },
  {
    nama: "allorigins",
    bina: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    jenis: "xml"
  },
  {
    nama: "corsproxy",
    bina: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    jenis: "xml"
  }
];

/* ---------- 4. STATE ---------- */
const state = {
  semuaArtikel: [],
  ditapis: [],
  carian: "",
  bahasa: "",
  sumber: "",
  kategori: "semua",
  susun: "terkini",
  sedangMuat: false
};

/* ---------- 5. UTILITI ---------- */

function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tarikhValid(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function masaRelatif(date) {
  if (!date) return "";
  const saat = Math.floor((Date.now() - date.getTime()) / 1000);
  if (saat < 60) return "Baru sahaja";
  if (saat < 3600) return `${Math.floor(saat / 60)} minit lalu`;
  if (saat < 86400) return `${Math.floor(saat / 3600)} jam lalu`;
  if (saat < 604800) return `${Math.floor(saat / 86400)} hari lalu`;
  return date.toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" });
}

function tarikhPenuh(date) {
  if (!date) return "";
  return date.toLocaleString("ms-MY", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function ambilGambarDariHtml(html) {
  if (!html) return "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : "";
}

/* Kesan kategori ikut kata kunci */
function kesanKategori(artikel) {
  const teks = (artikel.tajuk + " " + artikel.ringkasan).toLowerCase();
  let terbaik = "umum";
  let markahTerbaik = 0;

  for (const [kat, senarai] of Object.entries(KATA_KUNCI)) {
    let markah = 0;
    for (const kata of senarai) {
      if (teks.includes(kata)) markah++;
    }
    if (markah > markahTerbaik) {
      markahTerbaik = markah;
      terbaik = kat;
    }
  }

  return markahTerbaik > 0 ? terbaik : "umum";
}

/* ---------- 6. CACHE ---------- */

function simpanCache(artikel) {
  try {
    localStorage.setItem(KEY_CACHE, JSON.stringify({ masa: Date.now(), artikel }));
  } catch (e) {
    console.warn("Gagal simpan cache:", e);
  }
}

function bacaCache() {
  try {
    const raw = localStorage.getItem(KEY_CACHE);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.artikel)) return null;
    return data;
  } catch {
    return null;
  }
}

function cacheMasihSegar(cache) {
  return cache && (Date.now() - cache.masa) < TTL_CACHE;
}

/* ---------- 7. FETCH + PARSE RSS ---------- */

async function fetchMelaluiProxy(sumber) {
  let ralatTerakhir = null;

  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy.bina(sumber.url), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let artikel = [];

      if (proxy.jenis === "json") {
        const data = await res.json();
        if (data.status !== "ok") throw new Error(data.message || "rss2json gagal");
        artikel = parseRss2Json(data.items, sumber);
      } else {
        const teks = await res.text();
        artikel = parseXmlRss(teks, sumber);
      }

      if (artikel.length > 0) {
        console.log(`✓ ${sumber.nama} melalui ${proxy.nama} (${artikel.length})`);
        return artikel;
      }
    } catch (e) {
      ralatTerakhir = e;
      console.warn(`✗ ${sumber.nama} melalui ${proxy.nama}:`, e.message);
    }
  }

  console.error(`Semua proxy gagal untuk ${sumber.nama}`, ralatTerakhir);
  return [];
}

function parseRss2Json(items, sumber) {
  return items.slice(0, HAD_PER_SUMBER).map((item) => {
    const ringkasan = stripHtml(item.description || item.content || "").slice(0, 220);
    const gambar = item.thumbnail
      || (item.enclosure && item.enclosure.link)
      || ambilGambarDariHtml(item.content || item.description || "");

    return {
      tajuk: stripHtml(item.title),
      pautan: item.link,
      tarikh: item.pubDate,
      ringkasan,
      gambar,
      sumber: sumber.nama,
      bahasa: sumber.bahasa
    };
  }).filter((a) => a.tajuk && a.pautan);
}

function parseXmlRss(teks, sumber) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(teks, "text/xml");

  if (doc.querySelector("parsererror")) throw new Error("XML tidak sah");

  let nod = Array.from(doc.querySelectorAll("item"));
  if (nod.length === 0) nod = Array.from(doc.querySelectorAll("entry"));

  return nod.slice(0, HAD_PER_SUMBER).map((item) => {
    const ambil = (tag) => {
      const el = item.querySelector(tag);
      return el ? el.textContent.trim() : "";
    };

    let pautan = ambil("link");
    const linkEl = item.querySelector("link[href]");
    if (linkEl) pautan = linkEl.getAttribute("href");

    const tajuk = ambil("title");
    const tarikh = ambil("pubDate") || ambil("published") || ambil("updated");

    const htmlKandungan =
      ambil("description") || ambil("summary") || ambil("content") || "";

    const ringkasan = stripHtml(htmlKandungan).slice(0, 220);

    let gambar = "";
    const media =
      item.querySelector("content[url]") ||
      item.querySelector("thumbnail[url]") ||
      item.querySelector("enclosure[url]");
    if (media) gambar = media.getAttribute("url");
    if (!gambar) gambar = ambilGambarDariHtml(htmlKandungan);

    return {
      tajuk: stripHtml(tajuk),
      pautan,
      tarikh,
      ringkasan,
      gambar,
      sumber: sumber.nama,
      bahasa: sumber.bahasa
    };
  }).filter((a) => a.tajuk && a.pautan);
}

/* ---------- 8. MUAT SEMUA ---------- */

async function muatSemuaBerita() {
  if (state.sedangMuat) return;
  state.sedangMuat = true;

  const btn = document.getElementById("btn-refresh");
  btn.classList.add("spin");
  setStatus("Memuatkan berita...");

  try {
    const hasil = await Promise.all(SUMBER_BERITA.map(fetchMelaluiProxy));
    const semua = hasil.flat();

    if (semua.length === 0) {
      const cache = bacaCache();
      if (cache) {
        state.semuaArtikel = cache.artikel;
        setStatus("Gagal muat semula. Memaparkan cache lama.");
      } else {
        setStatus("Gagal memuatkan berita. Sila cuba lagi.");
      }
    } else {
      const unik = Array.from(new Map(semua.map((a) => [a.pautan, a])).values());

      // Kesan kategori untuk setiap artikel
      unik.forEach((a) => { a.kategori = kesanKategori(a); });

      state.semuaArtikel = unik;
      simpanCache(unik);
      setStatus(`${unik.length} berita dimuatkan`);
    }

    isiPilihanSumber();
    tapisDanRender();

  } catch (e) {
    console.error(e);
    setStatus("Ralat semasa memuatkan berita.");
  } finally {
    state.sedangMuat = false;
    btn.classList.remove("spin");
    document.getElementById("skeleton").hidden = true;
  }
}

/* ---------- 9. NAVIGASI KATEGORI ---------- */

function isiKategoriNav() {
  const nav = document.getElementById("kategori-nav");
  nav.innerHTML = `<div class="kategori-nav-inner">${
    KATEGORI.map((k) => `
      <a href="#/${k.id}" class="kategori-btn" data-kat="${k.id}">
        <span class="ikon">${k.ikon}</span>
        <span>${k.nama}</span>
      </a>
    `).join("")
  }</div>`;
}

function kemaskiniNavAktif() {
  document.querySelectorAll(".kategori-btn").forEach((btn) => {
    btn.classList.toggle("aktif", btn.dataset.kat === state.kategori);
  });
}

function initRouting() {
  const bacaHash = () => {
    const hash = location.hash.replace(/^#\/?/, "").toLowerCase() || "semua";
    return KATEGORI.some((k) => k.id === hash) ? hash : "semua";
  };

  state.kategori = bacaHash();

  window.addEventListener("hashchange", () => {
    state.kategori = bacaHash();
    kemaskiniNavAktif();
    tapisDanRender();
    // Skrol ke atas supaya nampak tajuk kategori
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ---------- 10. TAPISAN + RENDER ---------- */

function isiPilihanSumber() {
  const sel = document.getElementById("tapisan-sumber");
  const senarai = [...new Set(state.semuaArtikel.map((a) => a.sumber))].sort();
  const semasa = sel.value;
  sel.innerHTML = '<option value="">Semua sumber</option>' +
    senarai.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  sel.value = semasa;
}

function tapisDanRender() {
  const q = state.carian.toLowerCase().trim();

  let hasil = state.semuaArtikel.filter((a) => {
    if (state.kategori !== "semua" && a.kategori !== state.kategori) return false;
    if (state.bahasa && a.bahasa !== state.bahasa) return false;
    if (state.sumber && a.sumber !== state.sumber) return false;
    if (q) {
      const teks = (a.tajuk + " " + a.ringkasan).toLowerCase();
      if (!teks.includes(q)) return false;
    }
    return true;
  });

  hasil.sort((a, b) => {
    const da = tarikhValid(a.tarikh)?.getTime() || 0;
    const db = tarikhValid(b.tarikh)?.getTime() || 0;
    return state.susun === "terkini" ? db - da : da - db;
  });

  state.ditapis = hasil;
  render(hasil);
}

function render(artikel) {
  const grid = document.getElementById("senarai-berita");
  const kosong = document.getElementById("kosong");

  document.getElementById("jumlah-berita").textContent =
    artikel.length > 0 ? `${artikel.length} artikel dipaparkan` : "";

  if (artikel.length === 0) {
    grid.innerHTML = "";
    kosong.hidden = false;
    return;
  }

  kosong.hidden = true;

  grid.innerHTML = artikel.map((a) => {
    const tarikh = tarikhValid(a.tarikh);
    const gambarHtml = a.gambar
      ? `<img class="kad-gambar" src="${escapeHtml(a.gambar)}" alt="" loading="lazy"
              onerror="this.outerHTML='<div class=\\'kad-gambar-tempat\\'>${escapeHtml(a.sumber)}</div>'">`
      : `<div class="kad-gambar-tempat">${escapeHtml(a.sumber)}</div>`;

    return `
      <article class="kad">
        ${gambarHtml}
        <div class="kad-isi">
          <div class="kad-meta">
            <span class="label label-sumber">${escapeHtml(a.sumber)}</span>
            <span class="label label-bahasa">${escapeHtml(a.bahasa)}</span>
          </div>
          <h2>
            <a href="${escapeHtml(a.pautan)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(a.tajuk)}
            </a>
          </h2>
          <p>${escapeHtml(a.ringkasan)}${a.ringkasan ? "..." : ""}</p>
          <time datetime="${tarikh ? tarikh.toISOString() : ""}"
                title="${tarikh ? escapeHtml(tarikhPenuh(tarikh)) : ""}">
            ${tarikh ? escapeHtml(masaRelatif(tarikh)) : "Tarikh tidak diketahui"}
          </time>
        </div>
      </article>
    `;
  }).join("");
}

function setStatus(teks) {
  document.getElementById("status-teks").textContent = teks;
  document.getElementById("masa-kemas").textContent = new Date().toLocaleString("ms-MY");
}

/* ---------- 11. TEMA ---------- */

function initTema() {
  const disimpan = localStorage.getItem(KEY_TEMA) || "cerah";
  const tema = disimpan === "gelap" ? "gelap" : "cerah";
  document.documentElement.setAttribute("data-tema", tema);
  document.getElementById("btn-tema").textContent = tema === "gelap" ? "☀️" : "🌙";

  // Update warna theme-color untuk PWA
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tema === "gelap" ? "#0f1115" : "#0f3460");
}

function tukarTema() {
  const semasa = document.documentElement.getAttribute("data-tema");
  const baru = semasa === "gelap" ? "cerah" : "gelap";
  document.documentElement.setAttribute("data-tema", baru);
  localStorage.setItem(KEY_TEMA, baru);
  document.getElementById("btn-tema").textContent = baru === "gelap" ? "☀️" : "🌙";

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", baru === "gelap" ? "#0f1115" : "#0f3460");
}

/* ---------- 12. PWA ---------- */

function daftarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((reg) => console.log("✓ SW didaftarkan:", reg.scope))
      .catch((err) => console.warn("✗ SW gagal:", err));
  });
}

function initPemasanganPWA() {
  let promptTertunda = null;
  const btn = document.getElementById("btn-pasang");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptTertunda = e;
    btn.hidden = false;
  });

  btn.addEventListener("click", async () => {
    if (!promptTertunda) return;
    promptTertunda.prompt();
    const { outcome } = await promptTertunda.userChoice;
    console.log("PWA pilihan:", outcome);
    promptTertunda = null;
    btn.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    btn.hidden = true;
    promptTertunda = null;
    console.log("✓ PWA dipasang");
  });

  // Kalau sudah dipasang (standalone), sembunyikan butang
  if (window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true) {
    btn.hidden = true;
  }
}

/* ---------- 13. EVENT LISTENERS ---------- */

function ikatEvent() {
  let timer;
  document.getElementById("carian").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.carian = e.target.value;
      tapisDanRender();
    }, 250);
  });

  document.getElementById("tapisan-bahasa").addEventListener("change", (e) => {
    state.bahasa = e.target.value;
    tapisDanRender();
  });

  document.getElementById("tapisan-sumber").addEventListener("change", (e) => {
    state.sumber = e.target.value;
    tapisDanRender();
  });

  document.getElementById("susun").addEventListener("change", (e) => {
    state.susun = e.target.value;
    tapisDanRender();
  });

  document.getElementById("btn-refresh").addEventListener("click", () => {
    localStorage.removeItem(KEY_CACHE);
    muatSemuaBerita();
  });

  document.getElementById("btn-tema").addEventListener("click", tukarTema);
}

/* ---------- 14. INIT ---------- */

async function init() {
  initTema();
  isiKategoriNav();
  initRouting();
  kemaskiniNavAktif();
  ikatEvent();
  daftarServiceWorker();
  initPemasanganPWA();

  const cache = bacaCache();
  if (cache && Array.isArray(cache.artikel) && cache.artikel.length > 0) {
    state.semuaArtikel = cache.artikel;
    document.getElementById("skeleton").hidden = true;
    isiPilihanSumber();
    tapisDanRender();
    setStatus("Memaparkan cache. Menyegarkan...");
  }

  if (cacheMasihSegar(cache)) {
    setStatus(`${cache.artikel.length} berita (dari cache)`);
    return;
  }

  await muatSemuaBerita();
}

document.addEventListener("DOMContentLoaded", init);