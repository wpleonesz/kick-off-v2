# Taller 2 - Paralelo D: Control de Accesos y Permisos (RBAC) para la API

## Informacion del Taller

| Campo             | Detalle                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| **Asignatura**    | Aplicaciones Moviles                                                   |
| **Tema**          | Implementar control de accesos basado en roles (RBAC) en endpoints API |
| **Duracion**      | 2 horas (120 minutos)                                                  |
| **Paralelo**      | D                                                                      |
| **Prerequisitos** | Proyecto kick-off-v2 corriendo, PostgreSQL activo, Postman instalado   |

---

## Contexto del Proyecto

El proyecto **Kick-Off** ya tiene un sistema base de control de accesos:

- Modelo `Base_role` con roles como `player`, `referee`, `organizer`, `owner`
- Modelo `Base_access` con permisos granulares: `read`, `create`, `write`, `remove`
- Modelo `Base_entity` que define las entidades protegidas (ej: "courts", "schedules")
- Middleware `access.js` que verifica permisos antes de ejecutar operaciones
- Middleware `auth.js` que verifica sesion/autenticacion

**Lo que NO existe y vamos a construir hoy:**

- Una nueva entidad `bookings` en el sistema de accesos
- Endpoints que apliquen permisos RBAC reales (no solo autenticacion)
- Un endpoint para que la app movil consulte sus permisos
- Logica de negocio: un `owner` puede gestionar reservas de sus canchas, un `player` solo las suyas

---

## Objetivo General

Implementar un sistema completo de control de accesos basado en roles para el modulo de reservas, demostrando como proteger endpoints API con permisos granulares que luego la app movil pueda consumir.

## Objetivos Especificos

1. Entender el modelo RBAC (Role-Based Access Control) del proyecto
2. Registrar una nueva entidad en el sistema de permisos
3. Configurar permisos por rol para la entidad
4. Aplicar el middleware `access` a endpoints reales
5. Crear un endpoint para que la app movil consulte permisos del usuario

---

## Parte 1: Teoria - RBAC en Aplicaciones Moviles (15 min)

### 1.1 Que es RBAC?

RBAC = **Role-Based Access Control**. En lugar de dar permisos a cada usuario individual, los agrupamos por **roles**.

```
Usuario "Juan"
    |
    tiene rol --> [player]
                    |
                    tiene acceso --> bookings: { read: true, create: true, write: false, remove: false }
                    |
                    tiene acceso --> courts: { read: true, create: false, write: false, remove: false }

Usuario "Maria"
    |
    tiene rol --> [owner]
                    |
                    tiene acceso --> bookings: { read: true, create: true, write: true, remove: true }
                    |
                    tiene acceso --> courts: { read: true, create: true, write: true, remove: true }
```

### 1.2 Por que es importante en apps moviles?

La app movil necesita saber los permisos del usuario para:

- **Mostrar/ocultar botones** (ej: solo mostrar "Eliminar" si tiene permiso `remove`)
- **Habilitar/deshabilitar funciones** (ej: "Crear cancha" solo para owners)
- **Validar en el servidor** (nunca confiar solo en la UI)

```
[App Movil]                                [Backend API]
     |                                          |
     |-- GET /api/user/my-access -->            |
     |                                   Consulta permisos
     |<-- { bookings: {read,create}, ... } --   |
     |                                          |
     | (muestra boton "Reservar")               |
     |                                          |
     |-- POST /api/bookings -->                 |
     |                           Middleware access verifica
     |                           que el rol tiene "create"
     |<-- 200 OK o 400 sin permiso --           |
```

### 1.3 Modelos involucrados en Kick-Off

```
Base_role  ──< Base_access >──  Base_entity
   |              |                  |
   |         read: true         code: "bookings"
   |         create: true       name: "Reservas"
   |         write: false       moduleId: FK
   |         remove: false
   |
Base_rolesOnUsers
   |
Base_user
```

### 1.4 Pregunta para la clase

> Si tenemos 100 usuarios y 4 roles, cuantos registros de permisos necesitamos configurar con RBAC vs sin RBAC (permisos individuales)?
>
> Con RBAC: 4 roles x N entidades. Sin RBAC: 100 usuarios x N entidades. RBAC escala mucho mejor.

---

## Parte 2: Registrar la Entidad "bookings" en el Sistema (20 min)

### 2.1 Entender las tablas del sistema de accesos

Primero, exploremos las tablas existentes. Abrir Prisma Studio:

```bash
npx prisma studio
```

Explorar:

1. `Base_entity` - Ver las entidades registradas (courts, schedules, etc.)
2. `Base_role` - Ver los roles (player, referee, organizer, owner)
3. `Base_access` - Ver los permisos configurados
4. `Base_module` - Ver los modulos (base, kickoff, audit)

### 2.2 Crear un seed para registrar la entidad y permisos

Vamos a crear un script que registre la entidad `bookings` y configure los permisos para cada rol.

**Archivo**: `prisma/seeds/bookings-access.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Configurando accesos para modulo de reservas...\n');

  // 1. Buscar el modulo kickoff
  const kickoffModule = await prisma.base_module.findFirst({
    where: { code: 'kickoff' },
  });

  if (!kickoffModule) {
    console.error('ERROR: No se encontro el modulo kickoff. Crealo primero.');
    return;
  }

  console.log(
    `Modulo encontrado: ${kickoffModule.name} (id: ${kickoffModule.id})`,
  );

  // 2. Crear la entidad "bookings"
  const entity = await prisma.base_entity.upsert({
    where: { code: 'bookings' },
    update: {},
    create: {
      code: 'bookings',
      name: 'Reservas',
      moduleId: kickoffModule.id,
    },
  });

  console.log(`Entidad creada/encontrada: ${entity.name} (id: ${entity.id})`);

  // 3. Definir permisos por rol
  const permissions = [
    {
      roleCode: 'player',
      read: true,
      create: true, // Puede crear reservas
      write: false, // No puede modificar (solo cancelar la suya)
      remove: false, // No puede eliminar
    },
    {
      roleCode: 'referee',
      read: true,
      create: false, // No necesita reservar
      write: false,
      remove: false,
    },
    {
      roleCode: 'organizer',
      read: true,
      create: true, // Puede reservar para eventos
      write: true, // Puede confirmar/modificar
      remove: false,
    },
    {
      roleCode: 'owner',
      read: true,
      create: true, // Puede reservar
      write: true, // Puede confirmar/rechazar
      remove: true, // Puede eliminar reservas
    },
  ];

  // 4. Crear los registros de acceso
  for (const perm of permissions) {
    const role = await prisma.base_role.findFirst({
      where: { code: perm.roleCode },
    });

    if (!role) {
      console.log(`  WARN: Rol '${perm.roleCode}' no encontrado, saltando...`);
      continue;
    }

    const access = await prisma.base_access.upsert({
      where: {
        entityId_roleId: {
          entityId: entity.id,
          roleId: role.id,
        },
      },
      update: {
        read: perm.read,
        create: perm.create,
        write: perm.write,
        remove: perm.remove,
      },
      create: {
        entityId: entity.id,
        roleId: role.id,
        read: perm.read,
        create: perm.create,
        write: perm.write,
        remove: perm.remove,
      },
    });

    console.log(
      `  ${perm.roleCode}: read=${perm.read} create=${perm.create} write=${perm.write} remove=${perm.remove}`,
    );
  }

  console.log('\nAccesos configurados exitosamente!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 2.3 Ejecutar el seed

```bash
node prisma/seeds/bookings-access.js
```

Salida esperada:

```
Configurando accesos para modulo de reservas...

Modulo encontrado: Kick-Off (id: 2)
Entidad creada/encontrada: Reservas (id: 5)
  player: read=true create=true write=false remove=false
  referee: read=true create=false write=false remove=false
  organizer: read=true create=true write=true remove=false
  owner: read=true create=true write=true remove=true

Accesos configurados exitosamente!
```

### 2.4 Verificar en Prisma Studio

Abrir Prisma Studio y verificar en `Base_access` que los nuevos registros existen:

```bash
npx prisma studio
```

### 2.5 Ejercicio rapido (3 min)

> Modificar el script para agregar un 5to rol: `admin` con TODOS los permisos (read, create, write, remove = true). Ejecutar nuevamente.

---

## Parte 3: Aplicar el Middleware de Acceso a Endpoints (25 min)

### 3.1 Como funciona el middleware `access`

Revisemos el middleware existente del proyecto:

```javascript
// middleware/access.js (ya existe en el proyecto)
const access = (entityCode) => {
  return nextConnect().use(database(AccessData)).use(handler(entityCode));
};
```

Cuando usamos `.use(access('bookings'))`:

1. Carga los permisos del usuario para la entidad `bookings`
2. Los inyecta en `request.access`
3. Luego, `request.do('create', ...)` verifica si `request.access.create === true`

### 3.2 Entendiendo request.do() y los permisos

El metodo `request.do(operacion, callback)` hace internamente:

```javascript
// Dentro de lib/api/index.js (simplificado)
handler = async (operation, method) => {
  this.#checkAccess(operation);  // <-- Verifica permiso
  await method(this, this.request.db);
};

#checkAccess = (operation) => {
  if (operation && this.request.access && !this.request.access[operation]) {
    throw new Error(`No tiene permisos para [${operation}]`);
  }
};
```

Mapeo de operaciones:
| Metodo HTTP | Operacion | Permiso requerido |
|-------------|-----------|-------------------|
| GET | `'read'` | `access.read === true` |
| POST | `'create'` | `access.create === true` |
| PUT | `'write'` | `access.write === true` |
| DELETE | `'remove'` | `access.remove === true` |

### 3.3 Crear endpoints protegidos con RBAC

**Archivo**: `pages/api/bookings/index.js`

```javascript
import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import api from '@middleware/api';
import database from '@middleware/database';
import access from '@middleware/access';
import BookingsData from '@database/bookings';

const handler = nextConnect();

handler
  .use(auth)
  .use(api)
  .use(access('bookings')) // <-- NUEVO: verifica permisos de entidad 'bookings'
  .use(database(BookingsData))
  .get((request) => {
    // 'read' --> requiere access.read === true
    request.do('read', async (api, prisma) => {
      try {
        const result = await prisma.bookings
          .where({ userId: request.user.id })
          .getAll();
        return api.successMany(result);
      } catch (error) {
        console.log(error);
        return api.failure('Error fetching bookings data');
      }
    });
  })
  .post((request) => {
    // 'create' --> requiere access.create === true
    // Un 'referee' con create=false sera rechazado aqui automaticamente
    request.do('create', async (api, prisma) => {
      try {
        const { courtId, scheduleId, date, notes } = request.body;

        if (!courtId || !scheduleId || !date) {
          return api.failure('courtId, scheduleId y date son obligatorios');
        }

        // Verificar disponibilidad
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
          return api.failure('Horario no disponible');
        }

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
        return api.failure('Error creating booking');
      }
    });
  });

export default handler;
```

### 3.4 Endpoint con permisos para actualizar y eliminar

**Archivo**: `pages/api/bookings/[id].js`

```javascript
import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import api from '@middleware/api';
import database from '@middleware/database';
import access from '@middleware/access';
import BookingsData from '@database/bookings';

const handler = nextConnect();

handler
  .use(auth)
  .use(api)
  .use(access('bookings')) // <-- Verifica permisos
  .use(database(BookingsData))
  .get((request) => {
    request.do('read', async (api, prisma) => {
      try {
        const result = await prisma.bookings
          .record(request.query.id)
          .getUnique();

        if (!result) return api.failure('Reserva no encontrada');
        return api.successOne(result);
      } catch (error) {
        return api.failure('Error fetching booking');
      }
    });
  })
  .put((request) => {
    // 'write' --> Solo organizer y owner pueden modificar
    request.do('write', async (api, prisma) => {
      try {
        const { status, notes, date } = request.body;

        const validStatuses = ['pending', 'confirmed', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
          return api.failure(
            `Estado invalido. Permitidos: ${validStatuses.join(', ')}`,
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
        return api.failure('Error updating booking');
      }
    });
  })
  .delete((request) => {
    // 'remove' --> Solo owner puede eliminar
    request.do('remove', async (api, prisma) => {
      try {
        const response = await prisma.bookings
          .record(request.query.id)
          .update({ active: false });

        return api.success(response);
      } catch (error) {
        return api.failure('Error deleting booking');
      }
    });
  });

export default handler;
```

### 3.5 Pregunta para la clase

> Si un usuario con rol `player` intenta hacer `PUT /api/bookings/1` para confirmar una reserva, que pasa?
>
> Respuesta: El middleware `access` carga sus permisos donde `write: false`. Cuando `request.do('write', ...)` ejecuta `#checkAccess('write')`, lanza un error porque `access.write` es `false`. El usuario recibe un error 400.

---

## Parte 4: Endpoint de Permisos para la App Movil (20 min)

### 4.1 Por que la app movil necesita conocer los permisos?

La app movil debe adaptar su interfaz segun los permisos del usuario:

```
// Si el usuario es 'player':
// - Ver boton "Reservar" (create: true)
// - NO ver boton "Confirmar reserva" (write: false)
// - NO ver boton "Eliminar" (remove: false)

// Si el usuario es 'owner':
// - Ver TODOS los botones
// - Ver seccion "Gestionar reservas de mis canchas"
```

### 4.2 Crear endpoint de permisos del usuario

**Archivo**: `pages/api/user/my-access.js`

```javascript
import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import database from '@middleware/database';
import AccessData from '@database/base/access';

const handler = nextConnect();

handler
  .use(auth)
  .use(database(AccessData, { auditable: false }))
  .get(async (request, response) => {
    try {
      const userId = request.user.id;

      // Admin (id=1) tiene todos los permisos
      if (userId === 1) {
        return response.status(200).json({
          isAdmin: true,
          permissions: {
            bookings: { read: true, create: true, write: true, remove: true },
            courts: { read: true, create: true, write: true, remove: true },
          },
        });
      }

      // Obtener permisos del usuario por sus roles
      const db = request.db.access;
      const accessList = await db
        .user(request.user)
        .entities(['bookings', 'courts'])
        .getAll();

      // Parsear en formato amigable para la app movil
      const permissions = db.parseByEntityCode(accessList);

      // Obtener roles del usuario
      const userWithRoles = await db.prisma.base_user.findUnique({
        where: { id: userId },
        select: {
          roles: {
            where: { active: true },
            select: {
              Role: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const roles = userWithRoles?.roles?.map((r) => r.Role) || [];

      return response.status(200).json({
        isAdmin: false,
        roles,
        permissions,
      });
    } catch (error) {
      console.error('Error al obtener permisos:', error);
      return response.status(500).json({
        message: 'Error al obtener permisos del usuario',
      });
    }
  });

export default handler;
```

### 4.3 Probar con Postman

**Como usuario player:**

```
GET http://localhost:3000/api/user/my-access
```

Respuesta esperada:

```json
{
  "isAdmin": false,
  "roles": [{ "code": "player", "name": "Jugador" }],
  "permissions": {
    "bookings": {
      "read": true,
      "create": true,
      "write": false,
      "remove": false
    },
    "courts": {
      "read": true,
      "create": false,
      "write": false,
      "remove": false
    }
  }
}
```

**Como usuario owner:**

```json
{
  "isAdmin": false,
  "roles": [{ "code": "owner", "name": "Propietario" }],
  "permissions": {
    "bookings": {
      "read": true,
      "create": true,
      "write": true,
      "remove": true
    },
    "courts": {
      "read": true,
      "create": true,
      "write": true,
      "remove": true
    }
  }
}
```

### 4.4 Como la app movil usa estos permisos

```typescript
// hooks/useAccess.ts (en la app Ionic)
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface AccessResponse {
  isAdmin: boolean;
  roles: { code: string; name: string }[];
  permissions: {
    [entity: string]: {
      read: boolean;
      create: boolean;
      write: boolean;
      remove: boolean;
    };
  };
}

export function useAccess() {
  return useQuery({
    queryKey: ['user-access'],
    queryFn: () => api.get<AccessResponse>('/api/user/my-access'),
    staleTime: 5 * 60 * 1000, // Cache 5 min
  });
}

// Uso en un componente:
// const { data: access } = useAccess();
// if (access?.permissions?.bookings?.create) {
//   mostrar boton "Reservar"
// }
```

---

## Parte 5: Probando RBAC Completo con Postman (15 min)

### 5.1 Matriz de pruebas

Probar cada operacion con diferentes roles:

| Operacion              | player              | referee             | organizer           | owner  |
| ---------------------- | ------------------- | ------------------- | ------------------- | ------ |
| GET /api/bookings      | 200 OK              | 200 OK              | 200 OK              | 200 OK |
| POST /api/bookings     | 200 OK              | **400 Sin permiso** | 200 OK              | 200 OK |
| PUT /api/bookings/1    | **400 Sin permiso** | **400 Sin permiso** | 200 OK              | 200 OK |
| DELETE /api/bookings/1 | **400 Sin permiso** | **400 Sin permiso** | **400 Sin permiso** | 200 OK |

### 5.2 Flujo de prueba paso a paso

**1. Login como player:**

```
POST http://localhost:3000/api/auth/signin
{ "username": "jugador1", "password": "password" }
```

**2. Verificar permisos:**

```
GET http://localhost:3000/api/user/my-access
```

> Debe mostrar bookings: { create: true, write: false, remove: false }

**3. Crear reserva (debe funcionar):**

```
POST http://localhost:3000/api/bookings
{
  "courtId": 1,
  "scheduleId": 1,
  "date": "2026-03-20"
}
```

> 200 OK - El player tiene permiso `create`

**4. Intentar confirmar reserva (debe fallar):**

```
PUT http://localhost:3000/api/bookings/1
{ "status": "confirmed" }
```

> 400 Error - El player NO tiene permiso `write`

**5. Cerrar sesion y login como owner:**

```
GET http://localhost:3000/api/auth/signout
POST http://localhost:3000/api/auth/signin
{ "username": "propietario1", "password": "password" }
```

**6. Confirmar reserva (debe funcionar):**

```
PUT http://localhost:3000/api/bookings/1
{ "status": "confirmed" }
```

> 200 OK - El owner tiene permiso `write`

**7. Eliminar reserva (debe funcionar):**

```
DELETE http://localhost:3000/api/bookings/1
```

> 200 OK - El owner tiene permiso `remove`

---

## Parte 6: Ejercicio Evaluado (15 min)

### Consigna

Crear un endpoint protegido que permita a un **owner** ver TODAS las reservas de sus canchas (no solo las propias), mientras que un **player** solo vea las suyas.

**Archivo a crear**: `pages/api/bookings/manage.js`

**Requisitos**:

1. Usar middleware completo: `auth`, `api`, `access('bookings')`, `database`
2. Operacion: `'read'`
3. Si el usuario tiene rol `owner`:
   - Buscar canchas donde `userId === request.user.id`
   - Retornar todas las reservas de esas canchas
4. Si el usuario NO es owner:
   - Retornar solo sus propias reservas (`userId === request.user.id`)
5. Incluir datos de la cancha y del usuario que reservo

### Criterios de Evaluacion

| Criterio                                              | Puntos |
| ----------------------------------------------------- | ------ |
| Usa middleware completo (auth, api, access, database) | 2      |
| Diferencia correctamente entre owner y otros roles    | 3      |
| Owner ve reservas de SUS canchas (no de todas)        | 2      |
| Player ve solo SUS reservas                           | 1      |
| Incluye relaciones (court, user, schedule)            | 1      |
| Codigo limpio y manejo de errores                     | 1      |
| **Total**                                             | **10** |

### Pistas

```javascript
// Para saber si es owner, verificar los roles del usuario:
const userRoles = await prisma.bookings.prisma.base_rolesOnUsers.findMany({
  where: {
    userId: request.user.id,
    active: true,
    Role: { code: 'owner' },
  },
});
const isOwner = userRoles.length > 0;

// Para buscar canchas del owner:
// await prisma.bookings.prisma.courts.findMany({
//   where: { userId: request.user.id, active: true },
//   select: { id: true },
// });

// Para filtrar reservas por multiples canchas:
// .where({ courtId: { in: [1, 3, 5] } })
```

---

## Parte 7: Cierre y Vision Completa (10 min)

### Diagrama completo del sistema RBAC

```
                        Base de Datos
                            |
    ┌───────────────────────┼───────────────────────┐
    |                       |                       |
Base_role              Base_entity             Base_access
 - player               - bookings              roleId + entityId
 - referee               - courts               read: true/false
 - organizer                                    create: true/false
 - owner                                        write: true/false
    |                                            remove: true/false
    |
Base_rolesOnUsers
    |
Base_user ───> Login ───> Session ───> Middleware auth
                                          |
                                    Middleware access('bookings')
                                          |
                                    Carga permisos del usuario
                                          |
                                    request.do('create', ...)
                                          |
                                    #checkAccess('create')
                                          |
                                   access.create === true?
                                      /          \
                                    SI            NO
                                    |              |
                              Ejecuta handler   Error 400
```

### Como se integra con la app movil

```
[App Movil - Login]
        |
        v
[GET /api/user/my-access]  -->  Guardar permisos en storage local
        |
        v
[Renderizar UI segun permisos]
        |
  ┌─────┼─────────────┐
  |     |              |
 read  create      write/remove
  |     |              |
 Ver   Boton         Botones
lista  "Reservar"   "Confirmar"/"Eliminar"
  |     |              |
  v     v              v
 GET   POST          PUT/DELETE
  |     |              |
  Servidor verifica permisos OTRA VEZ
  (nunca confiar solo en la UI)
```

### Principio de seguridad clave

> **Doble validacion**: La app movil oculta botones por UX, pero el servidor SIEMPRE verifica permisos. Un usuario malicioso podria hacer peticiones HTTP directamente saltandose la UI.

---

## Resumen de Archivos Creados/Modificados

| Archivo                           | Descripcion                              |
| --------------------------------- | ---------------------------------------- |
| `prisma/seeds/bookings-access.js` | Script para registrar entidad y permisos |
| `database/bookings/schemas.js`    | Schemas de seleccion para reservas       |
| `database/bookings/index.js`      | Clase BookingsData extends ObjectData    |
| `pages/api/bookings/index.js`     | GET + POST con middleware access         |
| `pages/api/bookings/[id].js`      | GET + PUT + DELETE con middleware access |
| `pages/api/user/my-access.js`     | Endpoint de permisos para la app movil   |

## Tarea para la Proxima Clase

1. Completar el ejercicio evaluado (`pages/api/bookings/manage.js`)
2. Investigar: que pasa si un usuario tiene DOS roles y uno permite `write` pero el otro no? Como se resolveria el conflicto?
3. Pensar: como implementarias un permiso temporal? (ej: un jugador puede cancelar su propia reserva dentro de las primeras 2 horas)

---

## Recursos

- [OWASP - Access Control](https://owasp.org/www-community/Access_Control)
- [RBAC Wikipedia](https://es.wikipedia.org/wiki/Control_de_acceso_basado_en_roles)
- [Prisma Relations - Many to Many](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations)
- [Next.js Middleware](https://nextjs.org/docs/api-routes/api-middlewares)
