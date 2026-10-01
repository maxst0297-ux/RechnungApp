// Datumswerte werden als „JJJJ-MM-TT" (ohne Uhrzeit) gespeichert – eindeutig sortierbar und zeitzonensicher.

const pad = n => String(n).padStart(2, '0');

/** Heutiges Datum (lokale Zeit) als „JJJJ-MM-TT". */
export function heuteIso(jetzt = new Date()) {
  return `${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}-${pad(jetzt.getDate())}`;
}
export function istIso(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(zuDate(s).getTime()); }
export function zuDate(iso) { const [j, m, t] = String(iso).split('-').map(Number); return new Date(j, (m || 1) - 1, t || 1, 12); }
/** „2026-10-01" + 14 → „2026-10-15" */
export function plusTage(iso, tage) { const d = zuDate(iso); d.setDate(d.getDate() + Number(tage || 0)); return heuteIso(d); }
export function plusMonate(iso, monate) { const d = zuDate(iso); d.setMonth(d.getMonth() + Number(monate || 0)); return heuteIso(d); }
/** Tage von a bis b (b − a). */
export function tageZwischen(a, b) { return Math.round((zuDate(b) - zuDate(a)) / 86400000); }
/** „2026-10-01" → „01.10.2026" */
export function datumDe(iso) { if (!istIso(iso)) return ''; const [j, m, t] = iso.split('-'); return `${t}.${m}.${j}`; }
/** Leistungszeitraum lesbar: gleicher Tag → „22.09.2026", sonst „22.09.–26.09.2026" */
export function zeitraumDe(von, bis) {
  if (!istIso(von)) return '';
  if (!istIso(bis) || bis === von) return datumDe(von);
  const [j1, m1, t1] = von.split('-'), [j2, m2, t2] = bis.split('-');
  if (j1 === j2) return `${t1}.${m1}.–${t2}.${m2}.${j2}`;
  return `${datumDe(von)} – ${datumDe(bis)}`;
}
export const jahrAus = iso => Number(String(iso).slice(0, 4));
