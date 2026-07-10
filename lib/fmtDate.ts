/**
 * Formateo seguro de fechas — evita el bug de timezone off-by-one.
 *
 * El backend guarda fechas como DATE (Prisma) que Prisma serializa a ISO
 * con hora "00:00:00.000Z". Sin cuidado, hacer new Date("2026-08-07") o
 * new Date("2026-08-07T00:00:00.000Z") interpreta esa fecha como MEDIANOCHE
 * UTC. Al convertirla a la hora local de Guatemala (UTC-6), quedan las
 * 18:00 del día anterior → toLocaleDateString muestra "6 ago" en vez de
 * "7 ago". Es el bug clásico de fecha off-by-one.
 *
 * Este helper extrae YYYY-MM-DD del string y construye la fecha en LOCAL
 * a las 12:00 del mediodía. Los tres números Y-M-D forman una fecha local
 * a mediodía, que en cualquier timezone razonable sigue siendo ese mismo día
 * al formatear.
 *
 * Uso:
 *   fmtDate("2026-08-07")                            → "07 ago 2026"
 *   fmtDate("2026-08-07T00:00:00.000Z")              → "07 ago 2026"
 *   fmtDate("2026-08-07", { day: '2-digit', ... })   → formato custom
 *   fmtDate(null)                                     → "—"
 */
export function fmtDate(
  input: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
  locale: string = 'es-GT',
): string {
  if (input == null || input === '') return '—';
  const s = typeof input === 'string' ? input : input.toISOString();

  // Camino feliz: extraer YYYY-MM-DD del prefijo y construir Date LOCAL a mediodía.
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, y, mo, d] = m;
    const local = new Date(Number(y), Number(mo) - 1, Number(d), 12, 0, 0);
    return local.toLocaleDateString(locale, opts);
  }

  // Fallback para strings con formato distinto (p.ej. epoch ms como string).
  const fallback = new Date(s);
  if (isNaN(fallback.getTime())) return '—';
  return fallback.toLocaleDateString(locale, opts);
}

/**
 * Devuelve la fecha de HOY en formato YYYY-MM-DD según la zona LOCAL del
 * navegador. Uso para el value default de <input type="date">.
 *
 * Por qué no usar `new Date().toISOString().split('T')[0]`:
 *   ISO da UTC. Si son las 20:00 en Guatemala (UTC-6), en UTC son las 02:00
 *   del día siguiente → toISOString devuelve la fecha del día siguiente →
 *   el input aparece con la fecha equivocada.
 */
export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Convierte cualquier fecha a YYYY-MM-DD apto para <input type="date">.
 * Extrae Y-M-D del string sin pasar por conversión de timezone.
 */
export function toInputDate(input: string | Date | null | undefined): string {
  if (input == null || input === '') return '';
  const s = typeof input === 'string' ? input : input.toISOString();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}
