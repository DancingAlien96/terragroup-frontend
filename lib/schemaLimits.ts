/**
 * Límites de campos del schema de Prisma (VARCHAR sizes).
 * Estos números deben matchearse con prisma/schema.prisma en el backend.
 * Si cambia un VARCHAR en el schema, actualizar acá también.
 *
 * Uso típico en inputs:
 *   <input maxLength={LIMITS.vendedor.nombre} ... />
 */

export const LIMITS = {
  empresa: {
    nombre:   150,
    email:    150,
    telefono: 20,
    rfc:      20,
  },
  usuario: {
    nombre:   100,
    email:    150,
    username: 80,
  },
  vendedor: {
    nombre:    150,
    nit:       30,
    telefono:  20,
    email:     150,
    dpi:       30,
    direccion: 255,
  },
  propietario: {
    nombre:    150,
    nit:       20,
    telefono:  20,
    email:     150,
    direccion: 1000,            // TEXT en BD pero limitamos visualmente
  },
  lote: {
    clave:   50,
    manzana: 20,
    numero:  20,
  },
  venta: {
    descripcionLote:  255,
    numTransferencia: 100,
    metodoPago:       50,
  },
  pago: {
    metodoPago:  50,
    referencia:  100,
    descripcion: 500,
  },
  expediente: {
    nombre: 200,
  },
  proyecto: {
    nombre:      150,
    ubicacion:   255,
    descripcion: 1000,  // TEXT en BD, limitamos visualmente
  },
} as const;
