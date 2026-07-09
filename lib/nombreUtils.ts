/**
 * Convención latinoamericana: los últimos 2 words del nombre son los apellidos
 * (paterno + materno). Los primeros son los nombres.
 *
 * Casos manejados:
 *   - 4+ palabras: "Juan Ernesto Arriaza Amador" → "Arriaza Amador Juan Ernesto"
 *   - 3 palabras:  "Ana Pérez López"              → "Pérez López Ana"
 *   - 2 palabras:  "María López"                  → "López María"
 *   - 1 palabra:   "Madonna"                      → "Madonna" (sin cambio)
 *
 * Limitaciones conocidas:
 *   - Apellidos compuestos con "de", "de la", "del", "San" no se detectan
 *     automáticamente. "María de la Cruz" queda como "Cruz María de la".
 *   - Para mayor precisión habría que almacenar nombres y apellidos en
 *     columnas separadas en BD.
 */
export function formatearApellidoPrimero(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return nombre.trim();
  if (partes.length === 2) {
    const [n, a] = partes;
    return `${a} ${n}`;
  }
  const apellidos = partes.slice(-2);
  const nombres   = partes.slice(0, -2);
  return `${apellidos.join(' ')} ${nombres.join(' ')}`;
}

/**
 * Clave para ordenamiento alfabético por apellido. Normalizada para que
 * los acentos no rompan el orden ("Álvarez" cerca de "Alvarez") y sea
 * insensible a mayúsculas.
 */
export function apellidoParaOrdenar(nombre: string): string {
  return formatearApellidoPrimero(nombre)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
