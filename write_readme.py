import os

readme = r"""<!-- README COMPLETO DEL PROYECTO — para uso de agentes de IA y desarrolladores -->

# TERRAGROUP — Sistema SaaS de Cobranza para Lotificaciones

## RESUMEN DEL PROYECTO

TerraGroup es una plataforma SaaS (Software as a Service) diseñada para **dueños de empresas de lotificaciones**. Permite gestionar cobros, pagos, clientes (propietarios de lotes), reportes financieros, vendedores y comisiones, todo desde un panel web centralizado.

**El sistema NO tiene registro público.** Los accesos (usuario y contraseña) son creados manualmente por los administradores de TerraGroup cuando un cliente paga un plan. El cliente recibe sus credenciales y accede al sistema.

---

## STACK TECNOLÓGICO

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Next.js (App Router) | 16.2.4 |
| UI Framework | React | 19.2.4 |
| Estilos | Tailwind CSS | v4 |
| Lenguaje | TypeScript | ^5 |
| Backend | Node.js + Express | LTS |
| Base de datos | MySQL | 8.x |
| ORM | Sequelize o Prisma (elegir uno al iniciar backend) |  |
| Autenticación | JWT (JSON Web Tokens) | — |
| Comunicación | REST API (JSON) | — |

**Fuentes**: Geist Sans + Geist Mono (Google Fonts, ya configuradas en layout.tsx).

---

## ARQUITECTURA GENERAL

```
terragroup-frontend/   <- Next.js App Router (puerto 3000)
terragroup-backend/    <- Node.js + Express REST API (puerto 4000)
MySQL DB               <- Base de datos relacional
```

El frontend consume la API del backend mediante fetch o axios. No se usa Server Actions para llamadas al backend externo.

---

## PLANES DE SUSCRIPCIÓN

| Plan | Precio | Lotes máximos | Usuarios admin |
|---|---|---|---|
| Básico | $45/mes | Hasta 150 | 1 |
| Profesional | $90/mes | 151 – 300 | 3 |
| Empresarial | $150/mes | 301 – 1,000 | 5 |

### Plan Básico incluye:
- Registro de clientes y lotes
- Control de pagos (manual asistido)
- Historial de pagos por cliente
- Estado de cuenta básico
- Reporte mensual de ingresos
- Dashboard básico (ingresos y clientes activos)
- Recordatorios manuales
- Envío de recibo interno

### Plan Profesional (todo el Básico más):
- Control de mora automatizado
- Clasificación de cartera (al día, atrasado, crítico)
- Reportes mensuales y trimestrales
- Estados de cuenta automatizados
- Dashboard avanzado
- Exportación de reportes (PDF)
- Notificaciones automáticas (WhatsApp y Email)

### Plan Empresarial (todo el Profesional más):
- Expediente digital del cliente (documentos, contratos, comprobantes)
- Control de usuarios y roles (permisos y accesos)
- Supervisión operativa del equipo
- Reportes administrativos (mora por responsable, seguimiento de cobranza)
- Notificaciones automáticas (WhatsApp opcional)
- Soporte prioritario y configuración personalizada

---

## MÓDULOS DEL SISTEMA

### 1. Landing Page — ruta: /
Secciones:
- Navbar: Logo TerraGroup, links Funciones / Precios / Testimonios, botón "Ingresar"
- Hero: imagen de fondo de lotificación residencial, título "Gestiona tu lotificación sin complicaciones", subtítulo, botones "Solicitar demo gratuita" y "Ver funciones", badges (Seguridad bancaria, Configuración en 24h, Soporte prioritario)
- Funciones: cards con características
- Precios: los 3 planes con precios y features
- Testimonios: reseñas de clientes
- Footer: contacto, links legales

### 2. Login — ruta: /login
- Formulario: campo username + campo password
- POST /api/auth/login
- Guardar JWT en localStorage o cookie httpOnly
- Redirigir a /dashboard
- Sin registro público, sin "olvidé contraseña" en versión inicial

### 3. Dashboard — Panel de Control — ruta: /dashboard
KPIs (4 tarjetas en fila):
- Total Cobrado: ícono dólar verde, variación % vs mes anterior
- Pendiente de Cobro: ícono reloj amarillo, variación % vs mes anterior
- Cartera Vencida: ícono alerta rojo, variación % vs mes anterior
- Tasa de Cobranza: ícono % gris, variación % vs mes anterior

Gráficas:
- Cobranza Mensual: barras apiladas (Cobrado=verde, Pendiente=gris), últimos 6 meses con leyenda
- Distribución de Propietarios: dona con 4 estados:
  Al día (verde) 42/42%, Moroso (naranja) 28/28%, Vencido (rojo) 18/18%, Liquidado (azul) 12/12%
  Centro de la dona muestra total: 100

Secciones inferiores:
- Actividad Reciente: tabla de últimos pagos + botón "Ver todos"
- Mayores Deudores: lista de propietarios con mayor saldo pendiente

### 4. Gestión de Pagos — ruta: /dashboard/pagos
- Tabla de pagos con filtros (fecha, estado, propietario)
- Registrar pago manual
- Ver/editar detalle de pago
- Cambiar estado (pendiente / pagado / vencido)
- Generar recibo interno (PDF o vista imprimible)
- Historial por cliente/lote

### 5. Reportes — ruta: /dashboard/reportes
- Reporte mensual de ingresos
- Reporte trimestral (Plan Profesional+)
- Exportar PDF (Plan Profesional+)
- Filtros por fecha, vendedor, estado de cartera

### 6. Notificaciones — ruta: /dashboard/notificaciones
- Centro de notificaciones
- Recordatorios de pagos próximos a vencer
- Alertas de mora
- Marcar leída / no leída

### 7. Integración Bancaria — ruta: /dashboard/banco
- Conciliación de pagos bancarios
- Importar extractos bancarios
- Reconciliar pagos automáticamente

### 8. Alertas Personalizadas — ruta: /dashboard/alertas
- Configurar alertas (días antes de vencimiento, monto, etc.)
- Alertas por WhatsApp y/o Email (Plan Profesional+)
- Historial de alertas enviadas

### 9. Vendedores y Comisiones — ruta: /dashboard/vendedores
- Listado y registro de vendedores
- Asignar lotes/clientes a vendedores
- Calcular comisiones por cobros
- Reportes de comisiones (Plan Empresarial)

### 10. Configuración — ruta: /dashboard/configuracion
- Datos de la empresa
- Cambio de contraseña
- Gestión de usuarios adicionales (según plan)
- Roles y permisos (Plan Empresarial)

---

## LAYOUT DEL DASHBOARD

Layout compartido: /dashboard/layout.tsx

SIDEBAR (izquierdo, fijo, ~240px de ancho):
- Logo circular TG + nombre empresa del cliente
- Menú: Panel de Control / Gestión de Pagos / Reportes / Notificaciones / Integración Bancaria / Alertas Personalizadas / Vendedores y Comisiones
- Botón "Colapsar menú" al fondo con flecha
- Ítem activo: fondo verde claro (#DCFCE7), texto verde oscuro (#166534), borde izquierdo verde (#16A34A)

HEADER (superior, fijo):
- Izquierda: título de sección + subtítulo descriptivo
- Derecha: barra de búsqueda "Buscar propietario, lote..." + ícono campana con badge rojo + avatar con nombre y email

COLORES:
- Fondo general: #F9FAFB
- Sidebar fondo: blanco, borde derecho: #E5E7EB
- Botones primarios: #16A34A (verde)
- Tarjetas: fondo blanco, borde #E5E7EB, border-radius 12px, sombra sutil
- Header: fondo blanco, borde inferior

---

## ESTRUCTURA DE CARPETAS (FRONTEND)

```
terragroup-frontend/
├── app/
│   ├── layout.tsx              (YA EXISTE - layout raiz con fuentes Geist)
│   ├── globals.css             (YA EXISTE - estilos Tailwind globales)
│   ├── page.tsx                (YA EXISTE - REEMPLAZAR con landing page)
│   ├── login/
│   │   └── page.tsx
│   └── dashboard/
│       ├── layout.tsx          (sidebar + header compartido)
│       ├── page.tsx            (panel de control)
│       ├── pagos/page.tsx
│       ├── reportes/page.tsx
│       ├── notificaciones/page.tsx
│       ├── banco/page.tsx
│       ├── alertas/page.tsx
│       ├── vendedores/page.tsx
│       └── configuracion/page.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   └── Table.tsx
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── KPICard.tsx
│   │   ├── BarChart.tsx
│   │   ├── DonutChart.tsx
│   │   ├── RecentActivity.tsx
│   │   └── TopDebtors.tsx
│   └── landing/
│       ├── Navbar.tsx
│       ├── Hero.tsx
│       ├── Features.tsx
│       ├── Pricing.tsx
│       ├── Testimonials.tsx
│       └── Footer.tsx
├── lib/
│   ├── api.ts
│   └── auth.ts
├── types/
│   └── index.ts
├── middleware.ts               (proteccion rutas /dashboard/*)
├── public/
│   └── logo.svg
└── package.json
```

---

## ESTRUCTURA DE CARPETAS (BACKEND)

```
terragroup-backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── database.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   └── plan.middleware.ts
│   ├── modules/
│   │   ├── auth/ (routes, controller, service)
│   │   ├── empresas/
│   │   ├── usuarios/
│   │   ├── lotes/
│   │   ├── propietarios/
│   │   ├── pagos/
│   │   ├── reportes/
│   │   ├── notificaciones/
│   │   ├── vendedores/
│   │   └── alertas/
│   └── utils/
│       ├── jwt.ts
│       └── pdf.ts
├── package.json
└── tsconfig.json
```

---

## BASE DE DATOS — ESQUEMA MySQL

### planes
```
id           INT PK AUTO_INCREMENT
nombre       VARCHAR(50)       -- 'basico', 'profesional', 'empresarial'
precio       DECIMAL(10,2)
max_lotes    INT
max_usuarios INT
```

### empresas  (un registro por empresa cliente = tenant)
```
id           INT PK AUTO_INCREMENT
nombre       VARCHAR(150)
rfc          VARCHAR(20)
plan_id      INT FK planes.id
activo       BOOLEAN DEFAULT TRUE
fecha_inicio DATE
fecha_vence  DATE
created_at   TIMESTAMP
```

### usuarios
```
id           INT PK AUTO_INCREMENT
empresa_id   INT FK empresas.id
nombre       VARCHAR(100)
email        VARCHAR(150) UNIQUE
username     VARCHAR(80) UNIQUE
password     VARCHAR(255)      -- bcrypt hash
rol          ENUM('admin','vendedor','supervisor')
activo       BOOLEAN DEFAULT TRUE
created_at   TIMESTAMP
```

### lotes
```
id           INT PK AUTO_INCREMENT
empresa_id   INT FK empresas.id
clave        VARCHAR(50)
manzana      VARCHAR(20)
numero       VARCHAR(20)
superficie   DECIMAL(10,2)
precio_venta DECIMAL(12,2)
estado       ENUM('disponible','vendido','reservado')
created_at   TIMESTAMP
```

### propietarios  (compradores de lotes)
```
id            INT PK AUTO_INCREMENT
empresa_id    INT FK empresas.id
nombre        VARCHAR(150)
telefono      VARCHAR(20)
email         VARCHAR(150)
direccion     TEXT
estado_cuenta ENUM('al_dia','moroso','vencido','liquidado')
created_at    TIMESTAMP
```

### contratos
```
id                INT PK AUTO_INCREMENT
empresa_id        INT FK empresas.id
propietario_id    INT FK propietarios.id
lote_id           INT FK lotes.id
vendedor_id       INT FK usuarios.id
precio_total      DECIMAL(12,2)
enganche          DECIMAL(12,2)
mensualidad       DECIMAL(12,2)
num_mensualidades INT
fecha_inicio      DATE
fecha_fin         DATE
estado            ENUM('activo','liquidado','cancelado')
created_at        TIMESTAMP
```

### pagos
```
id                INT PK AUTO_INCREMENT
empresa_id        INT FK empresas.id
contrato_id       INT FK contratos.id
propietario_id    INT FK propietarios.id
monto             DECIMAL(12,2)
fecha_pago        DATE
fecha_vencimiento DATE
estado            ENUM('pendiente','pagado','vencido')
metodo_pago       VARCHAR(50)
referencia        VARCHAR(100)
created_at        TIMESTAMP
```

### notificaciones
```
id           INT PK AUTO_INCREMENT
empresa_id   INT FK empresas.id
usuario_id   INT FK usuarios.id
titulo       VARCHAR(200)
mensaje      TEXT
leida        BOOLEAN DEFAULT FALSE
created_at   TIMESTAMP
```

### vendedores_comisiones
```
id           INT PK AUTO_INCREMENT
empresa_id   INT FK empresas.id
vendedor_id  INT FK usuarios.id
pago_id      INT FK pagos.id
porcentaje   DECIMAL(5,2)
monto        DECIMAL(12,2)
pagada       BOOLEAN DEFAULT FALSE
created_at   TIMESTAMP
```

---

## API ENDPOINTS (REST)

Base URL: http://localhost:4000/api
Todas las rutas excepto /auth/login requieren: Authorization: Bearer TOKEN

Autenticación:
  POST  /auth/login          body: { username, password }
  POST  /auth/logout
  GET   /auth/me

Dashboard:
  GET   /dashboard/kpis
  GET   /dashboard/cobranza-mensual
  GET   /dashboard/distribucion-propietarios
  GET   /dashboard/actividad-reciente
  GET   /dashboard/mayores-deudores

Propietarios:
  GET/POST         /propietarios
  GET/PUT/DELETE   /propietarios/:id
  GET              /propietarios/:id/historial-pagos

Lotes:
  GET/POST         /lotes
  GET/PUT/DELETE   /lotes/:id

Contratos:
  GET/POST         /contratos
  GET/PUT          /contratos/:id

Pagos:
  GET/POST         /pagos
  GET/PUT          /pagos/:id
  GET              /pagos/:id/recibo

Reportes:
  GET   /reportes/mensual?mes=&anio=
  GET   /reportes/trimestral?trimestre=&anio=
  GET   /reportes/exportar-pdf?tipo=&mes=&anio=

Notificaciones:
  GET   /notificaciones
  PUT   /notificaciones/:id/leer
  DELETE /notificaciones/:id

Vendedores:
  GET/POST         /vendedores
  GET/PUT          /vendedores/:id
  GET              /vendedores/:id/comisiones

Usuarios (solo admin):
  GET/POST         /usuarios
  GET/PUT/DELETE   /usuarios/:id

---

## FLUJO DE AUTENTICACIÓN

1. Usuario va a /login, escribe username y password
2. Frontend: POST /api/auth/login
3. Backend: verifica bcrypt, confirma empresa activa y plan vigente
4. Backend responde: { token: "JWT...", user: { id, nombre, rol, empresa, plan } }
5. Frontend guarda el token (cookie httpOnly preferido; o localStorage)
6. middleware.ts de Next.js intercepta rutas /dashboard/* y valida token
7. Backend valida JWT con auth.middleware.ts en cada request
8. Token expirado o inválido: redirigir a /login

Payload del JWT:
{
  "sub": 1,
  "empresaId": 5,
  "rol": "admin",
  "plan": "profesional",
  "iat": 1234567890,
  "exp": 1235172690
}

---

## MULTI-TENANCY

Cada empresa es un tenant. Todas las tablas tienen empresa_id.
El backend SIEMPRE filtra por empresa_id del JWT (nunca del body del request).
Esto evita que usuarios de empresa A accedan a datos de empresa B.

---

## FORMATO DE RESPUESTAS API

Éxito:   { "success": true,  "data": { ... } }
Error:   { "success": false, "message": "Descripción", "code": "ERROR_CODE" }

Códigos HTTP: 200, 201, 400, 401, 403, 404, 422, 500

---

## VARIABLES DE ENTORNO

Frontend (.env.local):
  NEXT_PUBLIC_API_URL=http://localhost:4000/api

Backend (.env):
  PORT=4000
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=terragroup
  DB_USER=root
  DB_PASS=tu_password
  JWT_SECRET=clave_secreta_muy_larga_minimo_32_caracteres
  JWT_EXPIRES_IN=7d

---

## COMANDOS

Frontend:
  cd terragroup-frontend
  npm install
  npm run dev   -> http://localhost:3000

Backend:
  cd terragroup-backend
  npm install
  npm run dev   -> http://localhost:4000

---

## CONVENCIONES DE CÓDIGO

- Variables/funciones: camelCase en inglés (fetchPayments, empresaId)
- Componentes React: PascalCase (KPICard, Sidebar)
- Labels de UI: en español
- Rutas Next.js: carpeta con page.tsx y layout.tsx
- 'use client' solo donde haya useState, useEffect, eventos del DOM
- Sin any en TypeScript; interfaces en types/index.ts
- Tailwind v4: sin tailwind.config.js; colores custom en globals.css con @theme

---

## NOTAS CRÍTICAS PARA EL AGENTE DE IA

1. Next.js 16 App Router: SOLO usar directorio app/. NO usar pages/.
2. React 19: agregar 'use client' donde haya useState, useEffect, eventos.
3. Tailwind v4: NO crear tailwind.config.js. Estilos custom van en globals.css con @theme.
4. Sin registro público: los admins de TerraGroup crean cuentas manualmente.
5. Multi-tenant: SIEMPRE filtrar por empresa_id del JWT en el backend.
6. Limites del plan: al crear lotes o usuarios, verificar que no excedan el máximo del plan.
7. Seguridad: bcrypt salt 12, JWT con expiracion, consultas SQL parametrizadas.
8. Estado actual del proyecto: el frontend tiene solo los archivos de create-next-app. El backend está completamente vacío. TODO debe construirse.
9. Leer AGENTS.md: indica revisar node_modules/next/dist/docs/ antes de escribir código Next.js por breaking changes.
"""

with open(r'c:\Users\cristofer perez\Documents\terragroup-frontend\README.md', 'w', encoding='utf-8') as f:
    f.write(readme)

print('README escrito correctamente:', len(readme), 'caracteres')
