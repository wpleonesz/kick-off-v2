# Taller 3: Optimizacion de Rendimiento en APIs con Node.js

## Objetivos de Aprendizaje

Al finalizar este taller, el estudiante sera capaz de:

1. Implementar cache distribuido con Redis para reducir consultas repetitivas a la base de datos
2. Utilizar DataLoader para resolver el problema de consultas N+1
3. Disenar e implementar colas de trabajo (Job Queues) para tareas asincronas
4. Aplicar Lazy Loading para cargar datos bajo demanda

---

## Parte 1: Cache con Redis - Evitar Consultas Repetitivas

### 1.1 Fundamento Teorico

**Problema:** Cuando 100 clientes solicitan la misma informacion (por ejemplo, la lista de canchas deportivas), el servidor ejecuta 100 consultas identicas a la base de datos. Esto genera:
- Sobrecarga innecesaria en la base de datos
- Tiempos de respuesta elevados
- Consumo excesivo de recursos del servidor

**Solucion:** Almacenar el resultado de la primera consulta en una capa intermedia de alta velocidad (cache). Las siguientes 99 solicitudes se sirven desde el cache sin tocar la base de datos.

**Redis** es un almacen de datos en memoria (in-memory) que opera como clave-valor. Su velocidad de lectura es de microsegundos frente a los milisegundos de una base de datos relacional.

```
                                    +-----------+
                                    |  Cliente  |
                                    +-----+-----+
                                          |
                                    +-----v-----+
                                    |   API      |
                                    +-----+-----+
                                          |
                              +-----------v-----------+
                              |  Existe en cache?     |
                              +---+---------------+---+
                                  |               |
                              SI  |               | NO
                                  v               v
                          +-------+-----+ +-------+-------+
                          | Retornar    | | Consultar BD  |
                          | desde Redis | | + Guardar en  |
                          +-------------+ | Redis con TTL |
                                          +---------------+
```

### 1.2 Implementacion Practica

#### Paso 1: Instalar dependencias

```bash
yarn add ioredis
```

#### Paso 2: Cliente Redis Singleton (`lib/cache/index.js`)

Se utiliza el patron Singleton para mantener una unica conexion a Redis durante toda la vida del proceso Node.js. En desarrollo, se almacena en `global` para sobrevivir al Hot Module Replacement (HMR) de Next.js.

```javascript
import Redis from 'ioredis';

const redis =
  global.__redis ||
  new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
    maxRetriesPerRequest: 3,
    lazyConnect: true,   // No conecta hasta la primera operacion
  });

if (process.env.NODE_ENV !== 'production') {
  global.__redis = redis;
}

export default redis;
```

**Conceptos clave:**
- `lazyConnect: true`: La conexion se establece solo cuando se ejecuta la primera operacion, optimizando el arranque.
- `global.__redis`: En desarrollo, Next.js recarga modulos frecuentemente (HMR). Sin esta tecnica, se crearian multiples conexiones a Redis.

#### Paso 3: Cache Manager (`lib/cache/cacheManager.js`)

Encapsula las operaciones de cache con manejo de errores graceful (si Redis falla, la aplicacion sigue funcionando sin cache).

```javascript
import redis from '@lib/cache';

/** TTL presets en segundos */
export const TTL = {
  MENU_TREE: 3600,       // 1 hora - menus no cambian frecuentemente
  USER_ACCESS: 300,       // 5 minutos - permisos pueden cambiar
  ROLE_ALL: 1800,         // 30 minutos
  COURTS_ALL: 1800,       // 30 minutos - canchas no cambian mucho
  COURT_SCHEDULES: 900,   // 15 minutos
  BOOKINGS: 300,          // 5 minutos - reservas cambian frecuentemente
};

/** Obtener dato del cache */
export const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Cache get error [${key}]:`, error.message);
    return null;  // Fallo graceful: si Redis falla, se consulta la BD
  }
};

/** Guardar dato en cache con TTL */
export const setCache = async (key, data, ttl) => {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (error) {
    console.error(`Cache set error [${key}]:`, error.message);
  }
};

/** Invalidar entradas de cache que coincidan con un patron */
export const invalidateCache = async (pattern) => {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor, 'MATCH', pattern, 'COUNT', 100,
      );
      cursor = nextCursor;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  } catch (error) {
    console.error(`Cache invalidate error [${pattern}]:`, error.message);
  }
};
```

**Conceptos clave:**
- **TTL (Time To Live):** Tiempo en segundos antes de que el dato expire automaticamente. Se define segun la frecuencia de cambio de cada tipo de dato.
- **Invalidacion por patron:** Cuando se crea/modifica un dato, se eliminan todas las entradas de cache relacionadas usando patrones glob (ej: `courts:*`).
- **Fallo graceful:** Si Redis no esta disponible, las funciones retornan `null` y la aplicacion consulta directamente a la BD.

#### Paso 4: Integracion en ObjectData (`lib/database/index.js`)

Se agregan los metodos `cacheable()` e `invalidates()` como parte del patron builder (fluent interface):

```javascript
// Lectura con cache
const courts = await db.courts
  .cacheable('courts:all', TTL.COURTS_ALL)  // Usar cache con TTL de 30 min
  .where({ active: true })
  .getAll();

// Escritura con invalidacion
const newCourt = await db.courts
  .invalidates(['courts:*', 'public:courts:*'])  // Limpiar cache relacionado
  .create(data);
```

Dentro de `getAll()`, el flujo es:
1. Si hay `_cacheKey`, intentar obtener del cache
2. Si hay cache hit, retornar inmediatamente
3. Si no, consultar a la BD y guardar en cache antes de retornar

#### Paso 5: Cache en Endpoints Publicos

```javascript
// pages/api/public/courts.js
import { getCache, setCache, TTL } from '@lib/cache/cacheManager';

handler.use(cors).get(async (request, response) => {
  const cacheKey = 'public:courts:all';
  const cached = await getCache(cacheKey);
  if (cached) return response.status(200).json(cached);

  const courtsData = new CourtsData();
  const courts = await courtsData
    .select(schemas.DEFAULT)
    .where({ active: true })
    .getAll();

  await setCache(cacheKey, courts, TTL.COURTS_ALL);
  response.status(200).json(courts);
});
```

### 1.3 Ejercicio Practico

**Tarea:** Implementar cache en el endpoint `/api/menu/tree` con las siguientes especificaciones:
- Clave de cache: `menu:tree:{userId}`
- TTL: 1 hora
- Invalidar cache cuando se modifique un menu

---

## Parte 2: DataLoader - Resolver el Problema N+1

### 2.1 Fundamento Teorico

**Problema N+1:** Ocurre cuando para obtener una lista de N elementos, se realiza 1 consulta inicial + N consultas adicionales para obtener datos relacionados.

**Ejemplo concreto:**
```
// 1 consulta para obtener 50 reservas
SELECT * FROM bookings LIMIT 50;

// + 50 consultas individuales para el dueño de cada cancha
SELECT * FROM courts WHERE id = 1;
SELECT * FROM courts WHERE id = 2;
SELECT * FROM courts WHERE id = 3;
... (47 mas)
```

**Total: 51 consultas** cuando podria resolverse con solo 2:
```
SELECT * FROM bookings LIMIT 50;
SELECT * FROM courts WHERE id IN (1, 2, 3, ...);
```

**DataLoader** (creado por Facebook para GraphQL) resuelve esto mediante dos tecnicas:
1. **Batching:** Acumula todas las solicitudes de un tick del Event Loop y las ejecuta en una sola consulta
2. **Caching por request:** Evita consultar el mismo ID mas de una vez dentro de la misma peticion

```
Event Loop Tick 1:
  loader.load(1)  ─┐
  loader.load(2)  ─┤── Se acumulan
  loader.load(3)  ─┘

Event Loop Tick 2:
  Se ejecuta UNA sola consulta:
  SELECT * FROM courts WHERE id IN (1, 2, 3)
```

### 2.2 Implementacion Practica

#### Paso 1: Instalar dependencia

```bash
yarn add dataloader
```

#### Paso 2: Crear Loaders (`lib/dataloader/index.js`)

Cada loader se crea como una instancia nueva por request para evitar contaminacion cruzada entre peticiones.

```javascript
import DataLoader from 'dataloader';
import prisma from '@database/client';

const createRoleLoader = () =>
  new DataLoader(async (ids) => {
    // UNA sola consulta para todos los IDs acumulados
    const roles = await prisma.base_role.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, code: true, name: true },
    });

    // Mapear resultados para mantener el orden de los IDs solicitados
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    return ids.map((id) => roleMap.get(id) || null);
  });

const createCourtLoader = () =>
  new DataLoader(async (ids) => {
    const courts = await prisma.courts.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true, name: true, location: true,
        latitude: true, longitude: true,
      },
    });
    const courtMap = new Map(courts.map((c) => [c.id, c]));
    return ids.map((id) => courtMap.get(id) || null);
  });

const createBookingsByCourtLoader = () =>
  new DataLoader(async (courtIds) => {
    // Consulta agrupada: obtener todas las reservas de multiples canchas
    const bookings = await prisma.bookings.findMany({
      where: { courtId: { in: [...courtIds] }, active: true },
    });

    // Agrupar por courtId
    const grouped = new Map();
    courtIds.forEach((id) => grouped.set(id, []));
    bookings.forEach((booking) => {
      const list = grouped.get(booking.courtId);
      if (list) list.push(booking);
    });
    return courtIds.map((id) => grouped.get(id) || []);
  });

// Fabrica: crea loaders frescos por cada request
export const createLoaders = () => ({
  role: createRoleLoader(),
  user: createUserLoader(),
  court: createCourtLoader(),
  bookingsByCourt: createBookingsByCourtLoader(),
});
```

**Regla critica:** El array retornado DEBE tener la misma longitud y orden que el array de IDs recibido. DataLoader asigna cada resultado a su solicitante basandose en el indice.

#### Paso 3: Inyectar en Middleware (`middleware/api.js`)

```javascript
import { createLoaders } from '@lib/dataloader';

const handler = () => {
  return async (request, response, next) => {
    const _api = new Api(request, response);
    request.api = _api;
    request.do = _api.handler;
    request.loaders = createLoaders();  // Loaders frescos por request
    parseId(request);
    next();
  };
};
```

#### Paso 4: Usar en Endpoints

```javascript
// En vez de N consultas individuales:
handler.get((request) => {
  request.do('read', async (api) => {
    const bookings = await prisma.bookings.findMany();

    // Cada load() se acumula y se ejecuta en batch
    const enriched = await Promise.all(
      bookings.map(async (booking) => ({
        ...booking,
        court: await request.loaders.court.load(booking.courtId),
      }))
    );

    return api.successMany(enriched);
  });
});
```

### 2.3 Comparacion de Rendimiento

| Escenario | Sin DataLoader | Con DataLoader |
|-----------|---------------|----------------|
| 50 reservas con datos de cancha | 51 queries | 2 queries |
| 100 usuarios con roles | 101 queries | 2 queries |
| 200 accesos con entidades | 201 queries | 2 queries |

### 2.4 Ejercicio Practico

**Tarea:** Crear un endpoint que liste todas las reservas de un usuario, incluyendo los datos de la cancha (nombre, ubicacion). Usar `request.loaders.court.load(courtId)` para evitar N+1.

---

## Parte 3: Cola de Trabajos (Job Queue)

### 3.1 Fundamento Teorico

**Problema:** Algunas operaciones son costosas y no necesitan completarse antes de responder al cliente:
- Enviar emails de confirmacion
- Registrar logs de auditoria
- Procesar imagenes
- Sincronizar datos con sistemas externos

Si estas operaciones se ejecutan en el flujo principal del request, el tiempo de respuesta aumenta innecesariamente.

**Solucion:** Mover las tareas pesadas a una cola de trabajos que las procesa en segundo plano.

```
Flujo SIN cola:
  Request → Guardar en BD → Enviar email → Crear log → Response
  Tiempo total: 50ms + 2000ms + 100ms = 2150ms

Flujo CON cola:
  Request → Guardar en BD → Encolar email → Encolar log → Response
  Tiempo total: 50ms + 1ms + 1ms = 52ms
  (Email y log se procesan en background)
```

### 3.2 Arquitectura de la Cola

```
                +------------------+
                |    API Handler   |
                +--------+---------+
                         |
                    queue.add()
                         |
                +--------v---------+
                |    Job Queue     |
                |  (In-Memory)     |
                |                  |
                |  [job1, job2,..] |
                +--------+---------+
                         |
              +----------+----------+
              |          |          |
        +-----v---+ +---v-----+ +-v-------+
        | Worker 1| | Worker 2| | Worker 3|
        | (mail)  | | (audit) | | (booking|
        +---------+ +---------+ +---------+
```

### 3.3 Implementacion Practica

#### Paso 1: Clase JobQueue (`lib/queue/JobQueue.js`)

Implementa una cola en memoria con control de concurrencia y reintentos con backoff exponencial.

```javascript
class JobQueue {
  constructor({ name, concurrency = 1, retries = 0, retryDelay = 1000 }) {
    this.name = name;
    this.concurrency = concurrency;  // Trabajos simultaneos maximo
    this.retries = retries;          // Intentos maximos ante fallo
    this.retryDelay = retryDelay;    // Delay base para backoff
    this.handlers = new Map();       // Funciones que procesan cada tipo de job
    this.queue = [];                 // Cola de trabajos pendientes
    this.running = 0;                // Trabajos ejecutandose ahora
    this.stats = { processed: 0, failed: 0, pending: 0 };
  }

  /** Registrar un handler para un tipo de trabajo */
  register = (jobType, handler) => {
    this.handlers.set(jobType, handler);
  };

  /** Agregar un trabajo a la cola */
  add = (jobType, data) => {
    const job = { type: jobType, data, attempt: 0 };
    this.queue.push(job);
    this.stats.pending++;
    this.#process();  // Intentar procesar inmediatamente
  };

  /** Procesar trabajos respetando la concurrencia */
  #process = () => {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      this.running++;
      this.stats.pending--;
      this.#execute(job);
    }
  };

  /** Ejecutar un trabajo con reintentos */
  #execute = async (job) => {
    const handler = this.handlers.get(job.type);
    try {
      await handler(job.data);
      this.stats.processed++;
    } catch (error) {
      job.attempt++;
      if (job.attempt <= this.retries) {
        // Backoff exponencial: 1s, 2s, 4s, 8s...
        const delay = this.retryDelay * Math.pow(2, job.attempt - 1);
        setTimeout(() => {
          this.queue.push(job);
          this.stats.pending++;
          this.#process();
        }, delay);
      } else {
        this.stats.failed++;
      }
    } finally {
      this.running--;
      this.#process();
    }
  };
}
```

**Conceptos clave:**
- **Concurrencia controlada:** Limita cuantos trabajos se ejecutan simultaneamente para no saturar recursos.
- **Backoff exponencial:** Si un trabajo falla, espera cada vez mas tiempo antes de reintentar (1s, 2s, 4s...), dando tiempo al recurso externo de recuperarse.
- **Handlers registrables:** Cada tipo de trabajo tiene su propia funcion procesadora.

#### Paso 2: Instancias de Colas (`lib/queue/index.js`)

```javascript
import JobQueue from './JobQueue';

// Cola para emails: 2 simultaneos, 3 reintentos
export const mailQueue = createQueue('mail', {
  concurrency: 2, retries: 3, retryDelay: 2000,
});

// Cola para auditoria: 3 simultaneos, 1 reintento (si falla, no es critico)
export const auditQueue = createQueue('audit', {
  concurrency: 3, retries: 1, retryDelay: 1000,
});

// Cola para reservas: 2 simultaneos, 2 reintentos
export const bookingQueue = createQueue('booking', {
  concurrency: 2, retries: 2, retryDelay: 1500,
});
```

#### Paso 3: Handlers (`lib/queue/handlers/`)

```javascript
// auditHandler.js - Procesa logs de auditoria
export const handleAuditLog = async (data) => {
  await prisma.audit_log.create({ data });
};

// bookingHandler.js - Procesa confirmaciones de reservas
export const handleBookingConfirmation = async (data) => {
  const { bookingId } = data;
  await prisma.bookings.update({
    where: { id: bookingId },
    data: { status: 'confirmed' },
  });
  await invalidateCache('bookings:*');
};
```

#### Paso 4: Uso en ObjectData (Auditoria via Queue)

Antes (sincrono - bloqueante):
```javascript
create_log = async (action, recordId, data) => {
  await this.prisma.audit_log.create({ data: { ... } });  // Bloquea la respuesta
};
```

Despues (asincrono - via queue):
```javascript
create_log = async (action, recordId, data) => {
  const { auditQueue } = await import('@lib/queue');
  const { setupQueues } = await import('@lib/queue/setup');
  setupQueues();
  auditQueue.add('createLog', {  // Se encola y retorna inmediatamente
    userId: this.audited?.id,
    table: this.tableName,
    action,
    data,
  });
};
```

### 3.4 Ejercicio Practico

**Tarea:** Implementar un handler de cola que envie un email de confirmacion cuando se crea una nueva reserva. El handler debe:
1. Registrarse en la `bookingQueue` como `sendConfirmation`
2. Recibir `{ email, courtName, date, startTime }`
3. Usar el servicio de email existente para enviar la notificacion

---

## Parte 4: Lazy Loading - Carga Bajo Demanda

### 4.1 Fundamento Teorico

**Problema:** Cargar todas las relaciones de un modelo consume memoria y tiempo innecesariamente cuando el cliente no necesita esa informacion.

**Ejemplo:**
```javascript
// EAGER LOADING: Carga TODO de una vez (incluso lo que no se necesita)
const court = await prisma.courts.findUnique({
  where: { id: 1 },
  include: {
    User: true,           // +1 JOIN
    courtShedules: true,  // +1 JOIN
    bookings: true,       // +1 JOIN (puede ser una lista ENORME)
  },
});
```

**Lazy Loading:** Solo cargar datos cuando realmente se necesitan. Se implementa en dos niveles:

### 4.2 Nivel 1: Select Schemas (Lazy Loading de Campos)

Definir exactamente que campos retornar segun el contexto, en lugar de retornar toda la fila.

```javascript
// database/courts/schemas.js

// Para listados: solo datos basicos
const DEFAULT = {
  id: true,
  name: true,
  location: true,
  latitude: true,
  longitude: true,
  isIndoor: true,
  active: true,
};

// Para detalle: incluye relaciones
const DETAIL = {
  ...DEFAULT,
  User: { select: { id: true, username: true, email: true } },
  courtShedules: { select: { id: true, dayOfWeek: true, startTime: true } },
};

// Para administracion: incluye todo
const ADMIN = {
  ...DETAIL,
  createdAt: true,
  updatedAt: true,
  bookings: {
    select: { id: true, date: true, status: true },
    where: { active: true },
    take: 10,  // Solo las 10 ultimas
  },
};
```

**Uso por contexto:**
```javascript
// Listado publico: solo campos basicos
const courts = await db.courts.select(schemas.DEFAULT).getAll();

// Detalle: incluye relaciones
const court = await db.courts.select(schemas.DETAIL).record(id).getUnique();
```

### 4.3 Nivel 2: Dynamic Import (Lazy Loading de Modulos)

Cargar modulos de Node.js solo cuando se necesitan, reduciendo el tiempo de arranque:

```javascript
// En ObjectData.create_log():
create_log = async (action, recordId, data) => {
  if (!(await this.#isAuditable())) return;

  // Solo importa la cola SI se necesita auditar
  const { auditQueue } = await import('@lib/queue');
  const { setupQueues } = await import('@lib/queue/setup');
  setupQueues();
  auditQueue.add('createLog', { ... });
};
```

### 4.4 Nivel 3: Paginacion como Lazy Loading de Datos

La paginacion con cursor es una forma de lazy loading a nivel de datos: solo carga la porcion de registros que el cliente necesita.

```javascript
// Primera pagina
const page1 = await db.courts.take(10).getAll();

// Segunda pagina (desde el ultimo ID de la pagina anterior)
const page2 = await db.courts.cursor(lastId).take(10).getAll();
```

**Paginacion por cursor vs offset:**
- **Offset (`skip`):** Rendimiento degradado en paginas altas (`OFFSET 10000` escanea 10000 filas)
- **Cursor:** Rendimiento constante sin importar la pagina (usa el indice del ID)

### 4.5 Ejercicio Practico

**Tarea:** Crear dos schemas para el modelo `bookings`:
- `LIST`: Solo campos basicos (id, date, status, courtId)
- `DETAIL`: Campos basicos + datos de la cancha + datos del usuario que reservo

---

## Parte 5: Integracion Completa - Diagrama de Flujo

```
Request del Cliente
       |
       v
+------+------+
| Middleware   |
| auth → api  |
| → database  |
| → access    |
+------+------+
       |
       v
+------+------+
| API Handler  |
+------+------+
       |
       v
+------+-----------+
| Hay cache?       |
+--+------------+--+
   |            |
  SI           NO
   |            |
   v            v
+--+---+  +----+------+
|Return|  | DataLoader|  ← Batch queries (evita N+1)
|cached|  | + Prisma  |
+------+  +----+------+
               |
               v
         +-----+------+
         | Select     |  ← Lazy Loading (solo campos necesarios)
         | Schema     |
         +-----+------+
               |
               v
         +-----+------+
         | Guardar en |
         | Cache      |
         +-----+------+
               |
               v
         +-----+------+
         | Audit Log  |  ← Job Queue (procesamiento asincrono)
         | via Queue  |
         +-----+------+
               |
               v
         +-----+------+
         | Response   |
         +------------+
```

---

## Resumen de Archivos Creados/Modificados

### Nuevos archivos:

| Archivo | Proposito |
|---------|-----------|
| `lib/cache/index.js` | Cliente Redis singleton |
| `lib/cache/cacheManager.js` | Operaciones de cache (get, set, invalidate) |
| `lib/dataloader/index.js` | Fabrica de DataLoaders por request |
| `lib/queue/JobQueue.js` | Clase cola de trabajos con concurrencia y reintentos |
| `lib/queue/index.js` | Instancias de colas (mail, audit, booking) |
| `lib/queue/setup.js` | Registro de handlers en colas |
| `lib/queue/handlers/auditHandler.js` | Procesador de logs de auditoria |
| `lib/queue/handlers/mailHandler.js` | Procesador de envio de emails |
| `lib/queue/handlers/bookingHandler.js` | Procesador de operaciones de reservas |

### Archivos modificados:

| Archivo | Cambio |
|---------|--------|
| `lib/database/index.js` | Metodos `cacheable()`, `invalidates()` + cache en queries + audit via queue |
| `middleware/api.js` | Inyeccion de DataLoaders en `request.loaders` |
| `middleware/access.js` | Cache de permisos de usuario (TTL: 5 min) |
| `pages/api/menu/tree.js` | Cache del arbol de menus (TTL: 1 hora) |
| `pages/api/public/courts.js` | Cache de canchas publicas (TTL: 30 min) |
| `pages/api/courts/index.js` | Invalidacion de cache al crear cancha |

---

## Configuracion de Entorno

Agregar las siguientes variables al archivo `.env`:

```env
# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

Para instalar Redis localmente:
- **macOS:** `brew install redis && brew services start redis`
- **Ubuntu:** `sudo apt install redis-server && sudo systemctl start redis`
- **Windows:** Usar Docker: `docker run -d -p 6379:6379 redis:alpine`

---

## Evaluacion

### Criterios de evaluacion:

1. **(25%)** Implementar cache en al menos 2 endpoints adicionales con TTL apropiado
2. **(25%)** Crear un DataLoader personalizado para una relacion del proyecto y demostrar que reduce queries
3. **(25%)** Implementar un handler de cola para una tarea especifica (email, notificacion, o procesamiento)
4. **(25%)** Crear schemas de lazy loading (LIST y DETAIL) para al menos 2 modelos

### Entregables:

- Codigo fuente con las implementaciones
- Capturas de pantalla mostrando el cache funcionando (logs de Redis o tiempos de respuesta)
- Diagrama explicativo del flujo de datos con las optimizaciones aplicadas

---

## Referencias

- [Redis Documentation](https://redis.io/docs/)
- [DataLoader GitHub - Pattern](https://github.com/graphql/dataloader)
- [Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Prisma Query Optimization](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance)
