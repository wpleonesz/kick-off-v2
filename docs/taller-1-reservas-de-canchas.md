# Taller 1 - Paralelo A: API de Reservas de Canchas Deportivas

## Informacion del Taller

| Campo | Detalle |
|-------|---------|
| **Asignatura** | Aplicaciones Moviles |
| **Tema** | Crear un sistema de reservas (bookings) sobre una API existente |
| **Duracion** | 2 horas (120 minutos) |
| **Paralelo** | A |
| **Prerequisitos** | Proyecto kick-off-v2 corriendo, PostgreSQL activo, Postman instalado |

---

## Contexto del Proyecto

El proyecto **Kick-Off** ya tiene implementado:
- CRUD de canchas (`courts`) con endpoints publicos y autenticados
- CRUD de horarios (`courtShedules`) asociados a cada cancha
- Sistema de autenticacion con Passport + sesiones
- Patron ObjectData para la capa de datos con Prisma

**Lo que NO existe y vamos a construir hoy:**
Un sistema donde un usuario autenticado pueda **seleccionar una cancha**, **elegir un horario disponible** y **crear una reserva**. Ademas, podremos consultar y cancelar reservas.

---

## Objetivo General

Construir los endpoints API necesarios para que la app movil permita a los usuarios reservar canchas deportivas en horarios disponibles, siguiendo los patrones arquitectonicos ya establecidos en el proyecto.

## Objetivos Especificos

1. Extender el schema de Prisma con un nuevo modelo `bookings`
2. Crear la capa de datos (ObjectData) para reservas
3. Implementar endpoints CRUD siguiendo el patron middleware del proyecto
4. Crear un endpoint publico para consultar disponibilidad
5. Validar que no existan reservas duplicadas en el mismo horario

---

## Parte 1: Entendiendo la Arquitectura Existente (15 min)

### 1.1 El patron del proyecto

Antes de escribir codigo, entendamos como fluye una peticion en este proyecto:

```
Request HTTP
    |
    v
[auth]       --> Valida sesion/passport (403 si no autenticado)
    |
[api]        --> Parsea query params (filter, take, skip, orderBy, etc.)
    |
[database]   --> Instancia ObjectData y la inyecta en request.db
    |
[handler]    --> request.do('operacion', async (api, db) => { ... })
```

### 1.2 Ejemplo real del proyecto: como funciona `courts`

```javascript
// pages/api/courts/index.js (simplificado)
handler
  .use(auth)                    // 1. Autenticar
  .use(api)                     // 2. Parsear queries
  .use(database(CourtsData))    // 3. Inyectar ObjectData
  .get((request) => {
    request.do('read', async (api, prisma) => {
      const result = await prisma.courts.getAll();  // 4. Usar ObjectData
      return api.successMany(result);                // 5. Responder
    });
  });
```

### 1.3 Pregunta para la clase

> Si un usuario hace GET /api/courts sin estar autenticado, que responde el servidor y por que?
> Respuesta: HTTP 403 `{ message: "No autorizado" }` porque el middleware `auth` lo rechaza.

---

## Parte 2: Disenar el Modelo de Datos (20 min)

### 2.1 Que necesita una reserva?

Pensemos juntos: si un usuario quiere reservar una cancha, que informacion necesitamos?

| Dato | Por que |
|------|---------|
| Que cancha | Para saber donde va a jugar |
| Que horario | Para saber el bloque de tiempo |
| Quien reserva | Para saber de quien es la reserva |
| Cuando juega | Fecha especifica de la reserva |
| Estado | Para poder confirmar o cancelar |

### 2.2 Agregar el modelo al Schema de Prisma

Abrir `prisma/schema.prisma` y agregar al final (antes del cierre):

```prisma
// ─── BOOKINGS MODULE ─────────────────────────────────────────────
model bookings {
  id         Int            @id @default(autoincrement())
  active     Boolean        @default(true)
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  date       DateTime                          // Fecha de la reserva
  status     String         @default("pending") // pending | confirmed | cancelled
  notes      String?                            // Notas opcionales
  courtId    Int
  court      courts         @relation(fields: [courtId], references: [id])
  scheduleId Int
  schedule   courtShedules  @relation(fields: [scheduleId], references: [id])
  userId     Int
  user       Base_user      @relation(fields: [userId], references: [id])
}
```

### 2.3 Actualizar las relaciones en los modelos existentes

Tambien necesitamos agregar la relacion inversa en los modelos que ya existen:

En el modelo `courts`, agregar:
```prisma
bookings      bookings[]
```

En el modelo `courtShedules`, agregar:
```prisma
bookings      bookings[]
```

En el modelo `Base_user`, agregar:
```prisma
bookings      bookings[]
```

### 2.4 Ejecutar la migracion

```bash
npx prisma migrate dev --name add_bookings_model
```

> **Importante**: Verificar que la migracion se ejecute sin errores. Si hay errores de relacion, revisar que los nombres de los campos coincidan con los modelos existentes.

### 2.5 Ejercicio rapido (3 min)

Abrir Prisma Studio y verificar que la tabla `bookings` se creo correctamente:

```bash
npx prisma studio
```

---

## Parte 3: Capa de Datos - ObjectData Pattern (20 min)

### 3.1 Crear los schemas de seleccion

Los schemas definen que campos retorna Prisma en cada consulta. Crear el archivo:

**Archivo**: `database/bookings/schemas.js`

```javascript
const DEFAULT = {
  id: true,
  date: true,
  status: true,
  notes: true,
  courtId: true,
  court: {
    select: {
      id: true,
      name: true,
      location: true,
      isIndoor: true,
    },
  },
  scheduleId: true,
  schedule: {
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      duration: true,
    },
  },
  userId: true,
  user: {
    select: {
      id: true,
      username: true,
      Person: {
        select: {
          name: true,
          lastName: true,
        },
      },
    },
  },
  active: true,
  createdAt: true,
  updatedAt: true,
};

const PUBLIC = {
  id: true,
  date: true,
  status: true,
  courtId: true,
  scheduleId: true,
  court: {
    select: {
      id: true,
      name: true,
    },
  },
  schedule: {
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
    },
  },
};

const schemas = { DEFAULT, PUBLIC };

export default schemas;
```

### 3.2 Explicacion: por que dos schemas?

- **DEFAULT**: Para endpoints autenticados, incluye toda la info (usuario, notas, timestamps)
- **PUBLIC**: Para consultar disponibilidad sin autenticacion, solo datos minimos

### 3.3 Crear la clase BookingsData

**Archivo**: `database/bookings/index.js`

```javascript
import ObjectData from '@lib/database';
import schemas from '@database/bookings/schemas';

class BookingsData extends ObjectData {
  constructor() {
    const name = 'bookings';
    const table = 'bookings';
    super(name, table, schemas);
  }
}

export default BookingsData;
```

### 3.4 Pregunta para la clase

> Por que la clase BookingsData tiene tan poco codigo? Donde esta la logica de getAll, create, update?
>
> Respuesta: La hereda de ObjectData. Ese patron evita duplicar CRUD en cada modulo.

---

## Parte 4: Endpoints API - CRUD de Reservas (30 min)

### 4.1 Listar y Crear Reservas

**Archivo**: `pages/api/bookings/index.js`

```javascript
import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import api from '@middleware/api';
import database from '@middleware/database';
import BookingsData from '@database/bookings';

const handler = nextConnect();

handler
  .use(auth)
  .use(api)
  .use(database(BookingsData))
  .get((request) => {
    request.do('read', async (api, prisma) => {
      try {
        // Filtrar por usuario autenticado (cada quien ve sus reservas)
        const result = await prisma.bookings
          .where({ userId: request.user.id })
          .getAll();
        return api.successMany(result);
      } catch (error) {
        console.log(error);
        return api.failure('Error fetching bookings data', error);
      }
    });
  })
  .post((request) => {
    request.do('create', async (api, prisma) => {
      try {
        const { courtId, scheduleId, date, notes } = request.body;

        // --- Validaciones ---
        if (!courtId || !scheduleId || !date) {
          return api.failure('courtId, scheduleId y date son obligatorios');
        }

        // Verificar que la cancha existe y esta activa
        const court = await prisma.bookings.table.findFirst
          ? null
          : null;

        // Verificar que no exista reserva en el mismo horario y fecha
        const existing = await prisma.bookings
          .clean({ noDefaultWhere: true })
          .where({
            courtId: parseInt(courtId),
            scheduleId: parseInt(scheduleId),
            date: new Date(date),
            status: { not: 'cancelled' },
            active: true,
          })
          .getFirst();

        if (existing) {
          return api.failure(
            'Ya existe una reserva para esta cancha en ese horario y fecha'
          );
        }

        // Crear la reserva
        const booking = await prisma.bookings.create({
          courtId: parseInt(courtId),
          scheduleId: parseInt(scheduleId),
          date: new Date(date),
          notes: notes || null,
          userId: request.user.id,
          status: 'pending',
        });

        return api.success(booking);
      } catch (error) {
        console.log(error);
        return api.failure('Error creating booking', error);
      }
    });
  });

export default handler;
```

### 4.2 Detalle, Actualizar y Cancelar Reserva

**Archivo**: `pages/api/bookings/[id].js`

```javascript
import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import api from '@middleware/api';
import database from '@middleware/database';
import BookingsData from '@database/bookings';

const handler = nextConnect();

handler
  .use(auth)
  .use(api)
  .use(database(BookingsData))
  .get((request) => {
    request.do('read', async (api, prisma) => {
      try {
        const result = await prisma.bookings
          .record(request.query.id)
          .getUnique();

        if (!result) {
          return api.failure('Reserva no encontrada');
        }

        return api.successOne(result);
      } catch (error) {
        console.log(error);
        return api.failure('Error fetching booking', error);
      }
    });
  })
  .put((request) => {
    request.do('write', async (api, prisma) => {
      try {
        const { status, notes, date } = request.body;

        // Solo permitir cambios validos de estado
        const validStatuses = ['pending', 'confirmed', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
          return api.failure(
            `Estado invalido. Valores permitidos: ${validStatuses.join(', ')}`
          );
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (date) updateData.date = new Date(date);

        const response = await prisma.bookings
          .record(request.query.id)
          .update(updateData);

        return api.success(response);
      } catch (error) {
        console.log(error);
        return api.failure('Error updating booking', error);
      }
    });
  })
  .delete((request) => {
    request.do('remove', async (api, prisma) => {
      try {
        const response = await prisma.bookings
          .record(request.query.id)
          .update({ active: false });

        return api.success(response);
      } catch (error) {
        return api.failure('Error deleting booking', error);
      }
    });
  });

export default handler;
```

### 4.3 Endpoint Publico: Consultar Disponibilidad

Este endpoint permite a la app movil mostrar que horarios estan libres sin requerir login.

**Archivo**: `pages/api/public/court-availability.js`

```javascript
import nextConnect from 'next-connect';
import cors from '@middleware/cors';
import BookingsData from '@database/bookings';
import CourtScheduleData from '@database/courts/schedules';
import schemas from '@database/bookings/schemas';
import scheduleSchemas from '@database/courts/schedules/schemas';

const handler = nextConnect();

handler.use(cors).get(async (request, response) => {
  try {
    const { courtId, date } = request.query;

    if (!courtId || !date) {
      return response.status(400).json({
        message: 'courtId y date son obligatorios. Ejemplo: ?courtId=1&date=2026-03-01',
      });
    }

    // 1. Obtener todos los horarios de esta cancha
    const scheduleData = new CourtScheduleData();
    const allSchedules = await scheduleData
      .select(scheduleSchemas.DEFAULT)
      .where({
        courtId: parseInt(courtId),
        active: true,
      })
      .getAll();

    // 2. Obtener reservas existentes para esa fecha
    const bookingsData = new BookingsData();
    const existingBookings = await bookingsData
      .select(schemas.PUBLIC)
      .where({
        courtId: parseInt(courtId),
        date: new Date(date),
        status: { not: 'cancelled' },
        active: true,
      })
      .getAll();

    // 3. Marcar disponibilidad
    const bookedScheduleIds = existingBookings.map((b) => b.scheduleId);

    const availability = allSchedules.map((schedule) => ({
      ...schedule,
      available: !bookedScheduleIds.includes(schedule.id),
    }));

    response.status(200).json({
      courtId: parseInt(courtId),
      date,
      schedules: availability,
      totalSlots: allSchedules.length,
      availableSlots: availability.filter((s) => s.available).length,
      bookedSlots: bookedScheduleIds.length,
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    response.status(500).json({
      message: error.message || 'Error al consultar disponibilidad',
    });
  }
});

export default handler;
```

---

## Parte 5: Probando con Postman (15 min)

### 5.1 Flujo completo de pruebas

Seguir este orden para probar todo el flujo:

**Paso 1 - Autenticarse:**
```
POST http://localhost:3000/api/auth/signin
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```
> Guardar la cookie de sesion (Postman lo hace automaticamente).

**Paso 2 - Ver canchas disponibles (publico):**
```
GET http://localhost:3000/api/public/courts
```

**Paso 3 - Ver horarios de una cancha (publico):**
```
GET http://localhost:3000/api/public/court-schedules?courtId=1
```

**Paso 4 - Consultar disponibilidad (publico):**
```
GET http://localhost:3000/api/public/court-availability?courtId=1&date=2026-03-15
```

**Paso 5 - Crear reserva (autenticado):**
```
POST http://localhost:3000/api/bookings
Content-Type: application/json

{
  "courtId": 1,
  "scheduleId": 1,
  "date": "2026-03-15",
  "notes": "Partido amistoso"
}
```

**Paso 6 - Ver mis reservas (autenticado):**
```
GET http://localhost:3000/api/bookings
```

**Paso 7 - Confirmar reserva (autenticado):**
```
PUT http://localhost:3000/api/bookings/1
Content-Type: application/json

{
  "status": "confirmed"
}
```

**Paso 8 - Verificar que el horario ya no esta disponible:**
```
GET http://localhost:3000/api/public/court-availability?courtId=1&date=2026-03-15
```
> El horario reservado deberia aparecer con `available: false`.

**Paso 9 - Cancelar reserva (autenticado):**
```
PUT http://localhost:3000/api/bookings/1
Content-Type: application/json

{
  "status": "cancelled"
}
```

**Paso 10 - Verificar que el horario se libero:**
```
GET http://localhost:3000/api/public/court-availability?courtId=1&date=2026-03-15
```

---

## Parte 6: Ejercicio Evaluado (15 min)

### Consigna

Crear un endpoint adicional para que un **propietario de cancha** pueda ver todas las reservas de sus canchas (no solo las propias).

**Archivo a crear**: `pages/api/bookings/by-court/[courtId].js`

**Requisitos**:
1. Debe ser autenticado (usar middleware `auth`)
2. Recibe el `courtId` como parametro de ruta
3. Opcionalmente filtra por `date` via query params (`?date=2026-03-15`)
4. Opcionalmente filtra por `status` via query params (`?status=confirmed`)
5. Retorna todas las reservas de esa cancha con datos del usuario que reservo
6. Debe seguir el patron del proyecto (nextConnect + middleware chain + request.do)

### Criterios de Evaluacion

| Criterio | Puntos |
|----------|--------|
| Sigue el patron middleware del proyecto (auth, api, database) | 2 |
| GET funcional con filtro por courtId | 2 |
| Filtros opcionales por date y status | 2 |
| Incluye datos del usuario que reservo (select con relacion) | 2 |
| Manejo de errores consistente con el resto del proyecto | 1 |
| Codigo limpio | 1 |
| **Total** | **10** |

### Pistas

```javascript
// Estructura basica del archivo
import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import api from '@middleware/api';
import database from '@middleware/database';
import BookingsData from '@database/bookings';

const handler = nextConnect();

handler
  .use(auth)
  .use(api)
  .use(database(BookingsData))
  .get((request) => {
    request.do('read', async (api, prisma) => {
      const { courtId } = request.query;
      const { date, status } = request.query;

      // Construir filtro dinamico...
      const where = { courtId: parseInt(courtId) };

      // Tu codigo aqui...
    });
  });

export default handler;
```

---

## Parte 7: Conexion con la App Movil (5 min)

### Asi se consumiria desde Ionic

```typescript
// services/bookings.service.ts (en la app movil)
import api from "../lib/api";

export interface Booking {
  id: number;
  date: string;
  status: "pending" | "confirmed" | "cancelled";
  notes?: string;
  court: { id: number; name: string };
  schedule: { dayOfWeek: number; startTime: string; endTime: string };
}

// Consultar disponibilidad (publico - sin auth)
export async function getAvailability(courtId: number, date: string) {
  return api.get(`/api/public/court-availability?courtId=${courtId}&date=${date}`, false);
}

// Crear reserva (requiere auth)
export async function createBooking(data: {
  courtId: number;
  scheduleId: number;
  date: string;
  notes?: string;
}) {
  return api.post("/api/bookings", data);
}

// Mis reservas (requiere auth)
export async function getMyBookings() {
  return api.get<Booking[]>("/api/bookings");
}

// Cancelar reserva (requiere auth)
export async function cancelBooking(id: number) {
  return api.put(`/api/bookings/${id}`, { status: "cancelled" });
}
```

### Flujo en la app movil

```
[Pantalla Canchas] --> Seleccionar cancha
        |
        v
[Pantalla Disponibilidad] --> GET /api/public/court-availability?courtId=1&date=...
        |                     Mostrar horarios con colores (verde=libre, rojo=ocupado)
        v
[Seleccionar horario libre] --> POST /api/bookings { courtId, scheduleId, date }
        |
        v
[Pantalla Mis Reservas] --> GET /api/bookings
                            Mostrar lista con opcion de cancelar
```

---

## Resumen de Archivos Creados

| Archivo | Descripcion |
|---------|-------------|
| `prisma/schema.prisma` | Modelo `bookings` agregado |
| `database/bookings/schemas.js` | Schemas de seleccion (DEFAULT, PUBLIC) |
| `database/bookings/index.js` | Clase BookingsData extends ObjectData |
| `pages/api/bookings/index.js` | GET (mis reservas) + POST (crear reserva) |
| `pages/api/bookings/[id].js` | GET + PUT + DELETE por ID |
| `pages/api/public/court-availability.js` | Consulta de disponibilidad publica |

## Tarea para la Proxima Clase

1. Agregar el endpoint del ejercicio evaluado (`by-court/[courtId].js`)
2. Pensar: como evitarias que dos usuarios reserven el mismo horario al mismo tiempo? (race condition)
3. Investigar: que es una transaccion de base de datos y como Prisma la implementa con `$transaction`

---

## Recursos

- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Next.js Dynamic API Routes](https://nextjs.org/docs/api-routes/dynamic-api-routes)
- [HTTP Status Codes](https://developer.mozilla.org/es/docs/Web/HTTP/Status)
- [Prisma Transactions](https://www.prisma.io/docs/guides/performance-and-optimization/prisma-client-transactions-guide)
