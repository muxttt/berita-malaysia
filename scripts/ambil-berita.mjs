/* Ambil RSS terus (tiada CORS di Node) dan simpan ke news.json.
   Jalankan: npm ci && npm run ambil */
import { readFile, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const SUMBER_BERITA = [
  { nama: "Bernama",      url: "https://www.bernama.com/bm/rssfeed.php",         bahasa: "BM" },
  { nama: "Sinar Harian", url: "https://www.sinarharian.com.my/rssFeed/0",       bahasa: "BM" },
  { nama: "Utusan",       url: "https://www.utusan.com.my/feed/",                bahasa: "BM" },
  { nama: "FMT Bahasa",   url: "https://www.freemalaysiatoday.com/category/bahasa/feed/", bahasa: "BM" },
  { nama: "NST",          url: "https://www.nst.com.my/feed",                    bahasa: "EN" },
  { nama: "Malaysiakini", url: "https://www.malaysiakini.com/rss/en/news.rss",   bahasa: "EN" },
  { nama: "FMT",          url: "https://www.freemalaysiatoday.com/feed/",        bahasa: "EN" },
  { nama: "Malay Mail",   url: "https://www.malaymail.com/feed/rss",             bahasa: "EN" }
];

const HAD_PER_SUMBER = 12;
const TIMEOUT_MS = 8000;
const SERENTAK = 3;
const FAIL = new URL("../news.json", import.meta.url);

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false, htmlEntities: false });

const ENTITI = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#039;": "'", "&#39;": "'", "&nbsp;": " " };
const nyahEntiti = (s) => s.replace(/&(amp|lt|gt|quot|nbsp|#0?39);/g, (m) => ENTITI[m]);
// Nyahkod dahulu (ada feed hantar HTML ter-escape), buang tag, kemudian nyahkod baki
const stripHtml = (s) => nyahEntiti(nyahEntiti(String(s ?? "")).replace(/<[^>]*>/g, " "))
  .replace(/\s+/g, " ")
  .trim();

const teks = (v) => (v && typeof v === "object" ? v["#text"] ?? "" : v ?? "");
const senarai = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function ambilGambar(item, html) {
  const m = senarai(item["media:content"])[0] || senarai(item["media:thumbnail"])[0] || senarai(item.enclosure)[0];
  if (m && m["@_url"]) return m["@_url"];
  const img = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? img[1] : "";
}

function parse(xml, sumber) {
  const doc = parser.parse(xml);
  const items = senarai(doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.["rdf:RDF"]?.item);
  return items.slice(0, HAD_PER_SUMBER).map((it) => {
    const html = teks(it["content:encoded"]) || teks(it.description) || teks(it.summary) || teks(it.content);
    const link = Array.isArray(it.link) ? it.link[0] : it.link;
    const pautan = typeof link === "object" ? link["@_href"] : teks(link);
    return {
      tajuk: stripHtml(teks(it.title)),
      pautan: String(pautan ?? "").trim(),
      tarikh: String(teks(it.pubDate) || teks(it.published) || teks(it.updated) || teks(it["dc:date"])).trim(),
      ringkasan: stripHtml(html).slice(0, 220),
      gambar: ambilGambar(it, html),
      sumber: sumber.nama,
      bahasa: sumber.bahasa
    };
  }).filter((a) => a.tajuk && a.pautan);
}

async function ambil(sumber) {
  const res = await fetch(sumber.url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BeritaMalaysiaBot/1.0)", Accept: "application/rss+xml, application/xml, text/xml, */*" }
  });
  // Sesetengah feed (cth Bernama BM) beri status 500 tetapi badan XML sah, jadi jangan tolak ikut status
  const buf = await res.arrayBuffer();
  const kod = /<\?xml[^>]*encoding=["']([^"']+)["']/i.exec(new TextDecoder("latin1").decode(buf.slice(0, 200)))?.[1] ?? "utf-8";
  let artikel;
  try {
    artikel = parse(new TextDecoder(kod).decode(buf), sumber);
  } catch (e) {
    throw new Error(`HTTP ${res.status}, parse gagal: ${e.message}`);
  }
  if (artikel.length === 0 && !res.ok) throw new Error(`HTTP ${res.status}`);
  if (artikel.length === 0) throw new Error("tiada item");
  return artikel;
}

async function bacaLama() {
  try { return JSON.parse(await readFile(FAIL, "utf8")).artikel ?? []; } catch { return []; }
}

const lama = await bacaLama();
const tarikhLama = new Map(lama.map((a) => [a.pautan, a.tarikh]));
const hasil = new Array(SUMBER_BERITA.length);
let idx = 0;

async function pekerja() {
  while (idx < SUMBER_BERITA.length) {
    const i = idx++;
    const s = SUMBER_BERITA[i];
    try {
      hasil[i] = await ambil(s);
      console.log(`✓ ${s.nama} (${hasil[i].length})`);
    } catch (e) {
      // Kekalkan item lama sumber ini supaya satu feed rosak tidak buang datanya
      hasil[i] = lama.filter((a) => a.sumber === s.nama);
      console.warn(`✗ ${s.nama}: ${e.message} — guna ${hasil[i].length} item lama`);
    }
  }
}
await Promise.all(Array.from({ length: SERENTAK }, pekerja));

const artikel = Array.from(new Map(hasil.flat().map((a) => [a.pautan, a])).values());
// Feed tanpa tarikh (cth Bernama): guna masa pertama kali dilihat
const sekarang = new Date().toUTCString();
for (const a of artikel) if (!a.tarikh) a.tarikh = tarikhLama.get(a.pautan) || sekarang;
if (artikel.length === 0) {
  console.error("Tiada artikel langsung — news.json tidak diubah.");
  process.exit(1);
}

await writeFile(FAIL, JSON.stringify({ dikemas: new Date().toISOString(), artikel }, null, 1) + "\n");
console.log(`Disimpan ${artikel.length} artikel`);
