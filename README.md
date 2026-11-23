# Auth RBAC API

API REST creada con Node.js, Express y PostgreSQL para practicar autenticación, autorización y control de acceso basado en roles y permisos (**RBAC**).

El proyecto permite registrar usuarios, iniciar sesión, obtener un perfil protegido, consultar usuarios y actualizar o suspender cuentas según los permisos asignados.

## Contenido

- [Qué hace la API](#qué-hace-la-api)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Configuración](#configuración)
- [Base de datos](#base-de-datos)
- [Roles y permisos](#roles-y-permisos)
- [Autenticación JWT](#autenticación-jwt)
- [Endpoints](#endpoints)
- [Ejemplos con curl](#ejemplos-con-curl)
- [Respuestas y errores](#respuestas-y-errores)
- [Comandos disponibles](#comandos-disponibles)
- [Cambios añadidos](#cambios-añadidos)
- [Notas para aprendizaje](#notas-para-aprendizaje)

## Qué hace la API

La API ofrece cuatro grupos principales de funcionamiento:

1. **Registro e inicio de sesión**
   - Crea usuarios con el rol `user`.
   - Guarda contraseñas cifradas con bcrypt.
   - Emite un token JWT al iniciar sesión.

2. **Autenticación**
   - Verifica el encabezado `Authorization: Bearer <token>`.
   - Comprueba que el usuario todavía existe.
   - Impide el acceso a cuentas suspendidas.
   - Recarga desde PostgreSQL el rol y los permisos actuales del usuario.

3. **Autorización**
   - Los permisos permiten acciones concretas.
   - Los roles permiten restricciones adicionales.
   - Una ruta puede exigir permisos, roles o ambos.

4. **Gestión de usuarios**
   - Lista usuarios con filtros opcionales.
   - Consulta usuarios por identificador.
   - Actualiza nombre, correo o rol.
   - Suspende o reactiva cuentas.
   - Protege acciones sobre administradores y evita que un usuario se suspenda a sí mismo.

## Tecnologías

- **Node.js** y **Express 5** para el servidor HTTP.
- **PostgreSQL** para persistencia.
- **pg** como cliente de PostgreSQL.
- **bcryptjs** para cifrado de contraseñas.
- **jsonwebtoken** para la creación y validación de JWT.
- **dotenv** para variables de entorno.
- **cors** para control de solicitudes desde navegadores.
- **node:test** para pruebas automatizadas integradas en Node.js.

## Arquitectura

El proyecto sigue una separación por responsabilidades:

```text
src/
├── app.js                 Configuración de Express y middlewares
├── config/db.js           Pool de conexiones PostgreSQL
├── controllers/           Adaptadores HTTP y respuestas
├── middlewares/
│   ├── auth.middleware.js Validación del JWT
│   ├── rbac.middleware.js Autorización por rol y permiso
│   └── validate.middleware.js Validación básica de entrada
├── routes/                Definición de rutas
└── services/              Lógica de negocio y consultas SQL
```

Flujo de una solicitud protegida:

```text
Cliente
  -> ruta Express
  -> validación opcional
  -> authenticate
  -> authorizePermissions / authorizeRoles
  -> controller
  -> service
  -> PostgreSQL
  -> respuesta JSON
```

Esta separación facilita reemplazar, probar o ampliar cada capa sin mezclar toda la lógica en un único archivo.

## Requisitos

- Node.js 18 o superior.
- PostgreSQL 14 o superior.
- Acceso a una terminal y a `psql`.
- `curl` o una herramienta similar, como Postman o Insomnia.

## Configuración

1. Instala las dependencias:

```bash
npm install
```

2. Copia la configuración de ejemplo:

```bash
cp .env.example .env
```

3. Edita `.env`:

```dotenv
APP_HOST=127.0.0.1
APP_PORT=3000
CORS_ORIGIN=http://localhost:3000
JSON_BODY_LIMIT=100kb

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu-clave
DB_NAME=auth_rbac

JWT_SECRET=usa-una-clave-larga-y-aleatoria
JWT_EXPIRES_IN=8h
```

`JWT_SECRET` debe ser secreto y suficientemente largo. Nunca lo incluyas en el repositorio ni lo compartas en producción.

4. Crea la base de datos:

```bash
createdb auth_rbac
```

O desde PostgreSQL:

```sql
CREATE DATABASE auth_rbac;
```

5. Ejecuta la migración y el seeder:

```bash
psql -U postgres -d auth_rbac -f migrations/001_init_schema.sql
psql -U postgres -d auth_rbac -f seeders/001_seed_data.sql
```

Ejecuta los archivos una sola vez sobre una base nueva. Las instrucciones usan `ON CONFLICT` en varias inserciones, pero recrear la migración sobre tablas existentes no está diseñada como una migración incremental.

6. Inicia la API:

```bash
npm run dev
```

También puede iniciarse sin recarga automática:

```bash
npm start
```

## Base de datos

La migración [`001_init_schema.sql`](migrations/001_init_schema.sql) crea cinco estructuras relacionadas:

### Tabla `roles`

| Campo | Descripción |
|---|---|
| `id` | Identificador numérico |
| `name` | Nombre único del rol |
| `description` | Descripción del rol |
| `created_at` | Fecha de creación |
| `updated_at` | Fecha de actualización |

### Tabla `permissions`

| Campo | Descripción |
|---|---|
| `id` | Identificador numérico |
| `slug` | Permiso único, por ejemplo `users:read` |
| `description` | Descripción de la acción |
| `created_at` | Fecha de creación |

### Tabla `role_permissions`

Relaciona roles y permisos mediante una clave primaria compuesta. Eliminar un rol o permiso elimina automáticamente sus relaciones por `ON DELETE CASCADE`.

### Tabla `users`

| Campo | Descripción |
|---|---|
| `id` | Identificador numérico |
| `full_name` | Nombre completo |
| `email` | Correo único |
| `password_hash` | Hash bcrypt de la contraseña |
| `role_id` | Rol asignado |
| `status` | `active` o `suspended` |
| `suspended_at` | Fecha de suspensión |
| `suspension_reason` | Motivo de suspensión |
| `created_at` | Fecha de creación |
| `updated_at` | Fecha de actualización |

La relación con `roles` usa `ON DELETE RESTRICT`: no es posible eliminar un rol mientras tenga usuarios asociados.

La migración incluye índices para correo, rol y estado. Además, agrega un índice único sobre `LOWER(email)` para evitar correos duplicados sin distinguir mayúsculas y minúsculas.

## Datos iniciales

El seeder crea:

- Roles `admin`, `moderator` y `user`.
- Permisos `users:read`, `users:update`, `users:suspend` y `roles:manage`.
- Todos los permisos para `admin`.
- `users:read` y `users:suspend` para `moderator`.
- Un usuario administrador de prueba.

Credenciales de desarrollo:

- Correo: `admin@practica.local`
- Contraseña: `Admin123!`

Estas credenciales son únicamente educativas. Cámbialas o elimina el usuario antes de publicar la API.

## Roles y permisos

### Permisos disponibles

| Permiso | Acción |
|---|---|
| `users:read` | Listar y consultar usuarios |
| `users:update` | Actualizar otros usuarios |
| `users:suspend` | Suspender o activar cuentas |
| `roles:manage` | Cambiar el rol de un usuario |

### Asignaciones iniciales

| Rol | Permisos |
|---|---|
| `admin` | Todos |
| `moderator` | `users:read`, `users:suspend` |
| `user` | Ninguno en las rutas administrativas |

El `admin` puede cambiar un rol porque conoce el permiso `roles:manage`. Un usuario solo puede cambiar su propio nombre o correo si tiene `users:update`.

## Autenticación JWT

La ruta de login busca el usuario por correo en minúsculas, compara su contraseña con el hash almacenado y genera un JWT si las credenciales son válidas.

El payload básico contiene:

```json
{
  "sub": 1,
  "role": "admin",
  "permissions": ["users:read", "users:update"]
}
```

Enviar el token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

El middleware de autenticación vuelve a consultar PostgreSQL. Esto significa que una suspensión o una modificación de rol toma efecto aunque ya exista un token emitido anteriormente.

## Endpoints

Resumen rápido:

| Método | Ruta | Autenticación | Permiso / rol |
|---|---|---|---|
| `GET` | `/up` | No | Ninguno |
| `POST` | `/api/auth/register` | No | Ninguno |
| `POST` | `/api/auth/login` | No | Ninguno |
| `GET` | `/api/profile` | Sí | Ninguno |
| `GET` | `/api/users` | Sí | `users:read` |
| `GET` | `/api/users/:id` | Sí | `users:read` |
| `PATCH` | `/api/users/:id` | Sí | `users:update` y, para cambiar el rol, `roles:manage` |
| `PATCH` | `/api/users/:id/suspend` | Sí | Rol `admin` o `moderator` y permiso `users:suspend` |
| `PATCH` | `/api/users/:id/activate` | Sí | Rol `admin` o `moderator` y permiso `users:suspend` |

### Salud de la API

#### `GET /up`

Verifica Express y PostgreSQL.

Respuesta:

```json
{
  "status": "OK",
  "service": "auth-rbac-api",
  "database": "conectada",
  "db_time": "2026-11-23T00:18:43.410Z"
}
```

### Registro

#### `POST /api/auth/register`

Público.

Campos:

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `full_name` | string | Sí | No puede estar vacío |
| `email` | string | Sí | Formato de correo válido |
| `password` | string | Sí | Mínimo 8 caracteres |

Ejemplo:

```json
{
  "full_name": "Usuario Ejemplo",
  "email": "usuario@example.com",
  "password": "ClaveSegura123"
}
```

El usuario nuevo recibe automáticamente el rol `user`.

### Inicio de sesión

#### `POST /api/auth/login`

Público.

```json
{
  "email": "usuario@example.com",
  "password": "ClaveSegura123"
}
```

Respuesta exitosa:

```json
{
  "message": "Inicio de sesión exitoso",
  "token": "JWT",
  "token_type": "Bearer",
  "expires_in": "8h",
  "user": {
    "id": 2,
    "full_name": "Usuario Ejemplo",
    "email": "usuario@example.com",
    "role": "user",
    "status": "active",
    "permissions": []
  }
}
```

### Perfil

#### `GET /api/profile`

Requiere autenticación.

Devuelve el usuario obtenido por el middleware a partir del token.

### Listar usuarios

#### `GET /api/users`

Requiere el permiso `users:read`.

Parámetros opcionales de consulta:

| Parámetro | Ejemplo | Descripción |
|---|---|---|
| `status` | `active` o `suspended` | Filtra por estado |
| `role` | `admin` | Filtra por nombre de rol |
| `search` | `correo` | Busca nombre o correo |
| `limit` | `20` | Máximo 100; valor predeterminado 50 |
| `offset` | `20` | Desplazamiento para paginación |

Ejemplo:

```text
GET /api/users?status=active&role=user&search=ejemplo&limit=20&offset=0
```

Respuesta de ejemplo:

```json
{
  "users": [
    {
      "id": 2,
      "full_name": "Usuario Ejemplo",
      "email": "usuario@example.com",
      "role_id": 3,
      "role": "user",
      "status": "active",
      "suspended_at": null,
      "suspension_reason": null,
      "created_at": "2026-11-23T00:20:00.000Z",
      "updated_at": "2026-11-23T00:20:00.000Z"
    }
  ],
  "count": 1
}
```

### Consultar un usuario

#### `GET /api/users/:id`

Requiere el permiso `users:read`.

### Actualizar usuario

#### `PATCH /api/users/:id`

Requiere el permiso `users:update`.

Campos opcionales:

```json
{
  "full_name": "Nuevo nombre",
  "email": "nuevo@example.com",
  "role_id": 2
}
```

Cambiar `role_id` requiere además el permiso `roles:manage` o el rol `admin`.

### Suspender usuario

#### `PATCH /api/users/:id/suspend`

Requiere uno de los roles `admin` o `moderator` y el permiso `users:suspend`.

```json
{
  "reason": "Incumplimiento de las reglas"
}
```

Protecciones:

- Un usuario no puede suspenderse a sí mismo.
- Un moderador no puede suspender a un administrador.
- Un administrador sí puede suspender a otro administrador.

### Reactivar usuario

#### `PATCH /api/users/:id/activate`

Requiere uno de los roles `admin` o `moderator` y el permiso `users:suspend`.

## Ejemplos con curl

### Comprobar el servidor

```bash
curl http://127.0.0.1:3000/up
```

### Registrar

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Usuario Ejemplo",
    "email": "usuario@example.com",
    "password": "ClaveSegura123"
  }'
```

### Iniciar sesión como administrador

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@practica.local",
    "password": "Admin123!"
  }'
```

Copia el valor de `token` obtenido.

### Consultar perfil

```bash
curl http://127.0.0.1:3000/api/profile \
  -H "Authorization: Bearer TU_TOKEN"
```

### Listar usuarios

```bash
curl "http://127.0.0.1:3000/api/users?status=active&limit=20" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Actualizar usuario

```bash
curl -X PATCH http://127.0.0.1:3000/api/users/2 \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Nombre actualizado"}'
```

### Suspender usuario

```bash
curl -X PATCH http://127.0.0.1:3000/api/users/2/suspend \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Cuenta suspendida para prueba"}'
```

## Respuestas y errores

Las respuestas correctas usan JSON y un código HTTP adecuado.

Ejemplo de error de validación:

```json
{
  "message": "Datos de entrada inválidos",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Debe ser un correo electrónico válido"
    }
  ]
}
```

Códigos HTTP usados:

| Código | Significado |
|---:|---|
| `200` | Solicitud procesada correctamente |
| `201` | Recurso creado |
| `400` | Datos inválidos o solicitud incorrecta |
| `401` | Token inexistente, inválido o expirado |
| `403` | Cuenta suspendida o permisos insuficientes |
| `404` | Ruta o recurso inexistente |
| `409` | Conflicto, como correo ya registrado |
| `413` | Cuerpo JSON demasiado grande |
| `500` | Error interno del servidor |

Ejemplo de usuario no autenticado:

```json
{
  "message": "Token de autenticación no proporcionado o formato inválido"
}
```

Ejemplo de permiso insuficiente:

```json
{
  "message": "No tienes permisos suficientes para realizar esta acción",
  "required_permissions": ["users:update"]
}
```

También se aceptan JSON mal formado y cuerpos grandes con respuestas específicas y controladas.

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia la API |
| `npm run dev` | Inicia la API con recarga automática |
| `npm run check` | Ejecuta comprobaciones de sintaxis |
| `npm test` | Ejecuta las pruebas con `node:test` |

## Cambios añadidos

Además de la estructura inicial, se añadieron o completaron las siguientes piezas:

- CRUD real de consulta, listado y actualización de usuarios.
- Endpoints separados para perfil, consulta y listado.
- Filtros de usuarios por estado, rol, búsqueda y paginación.
- Servicio centralizado para actualizar roles y datos.
- Protección contra auto-suspensión.
- Protección de administradores frente a moderadores.
- Validación reutilizable para tipos, campos obligatorios, correos y contraseñas.
- Validación explícita de `JSON` y rechazo de objetos o arrays inesperados.
- Middleware global para JSON inválido, payload excesivo y errores internos.
- Respuestas con códigos propios, como `VALIDATION_ERROR` o `USER_NOT_FOUND`.
- Verificación de las variables de entorno necesarias para PostgreSQL.
- Verificación de `JWT_SECRET` antes de firmar o validar tokens.
- Configuración de CORS y límite configurable para el cuerpo de solicitudes.
- Desactivación del encabezado `X-Powered-By`.
- Manejo de señales `SIGINT` y `SIGTERM` para cerrar Express y el pool PostgreSQL.
- Corrección de la ruta de salud y documentación completa.
- Scripts `check` y `test` en `package.json`.
- Pruebas de validación para datos válidos e inválidos.
- Contraseña funcional para el usuario administrador de desarrollo.
- Índice único sobre correos normalizados.

## Notas para aprendizaje

Este proyecto es útil para estudiar las responsabilidades de un backend, pero no debe considerarse terminado para producción. Como próximos ejercicios se pueden incorporar:

- Pruebas de integración con base PostgreSQL temporal.
- Pruebas unitarias para servicios y middlewares.
- Migraciones con una herramienta como `node-pg-migrate`.
- Refresh tokens o revocación de sesiones.
- Rate limiting contra intentos de login.
- Registro de intentos y auditoría de cambios.
- Validación más avanzada con una biblioteca como Zod.
- Eliminación lógica o física de usuarios.
- Endpoints para administrar roles y permisos.
- Cambio de contraseña y recuperación de cuenta.
- Logs estructurados y un sistema de trazabilidad.
- Contenedores Docker para PostgreSQL y Node.js.
- Configuración por entorno: desarrollo, prueba y producción.
