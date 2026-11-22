# TutoresOn-Line

Plataforma web que conecta estudiantes con tutores: búsqueda por materia/nivel/modalidad/zona/disponibilidad, reservas con validación de conflictos, gestión de solicitudes, reseñas y reputación, notificaciones y administración.

- **Manual de usuario:** [`manual-de-usuario.html`](manual-de-usuario.html) (ábrelo en el navegador).
- **Reglas de negocio:** [`docs/business-rules.md`](docs/business-rules.md).
- **Guía para agentes y convenciones:** [`AGENTS.md`](AGENTS.md).

## Stack

Next.js 15 (App Router, Server Components, Server Actions) · TypeScript estricto · Prisma 6 + SQLite · Zod · Tailwind CSS 4 · Argon2id (`@node-rs/argon2`) · Vitest.

## Puesta en marcha

Requisitos: Node.js 20+ y npm.

```bash
npm install                 # instala dependencias y genera el cliente Prisma
cp .env.example .env        # en Windows: copy .env.example .env
npm run db:migrate          # crea prisma/dev.db aplicando las migraciones
npm run db:seed             # carga datos de demostración
npm run dev                 # http://localhost:3000
```

### Cuentas de demostración (solo desarrollo)

Todas usan la contraseña `Demo12345` (definida en `prisma/seed.ts`).

| Rol | Correo |
| --- | --- |
| Estudiante | `laura.mendez@tutores.test` (también `pedro.alvarez@`, `sofia.nunez@`, `diego.herrera@`) |
| Profesor | `ana.torres@tutores.test` (y otros 8 aprobados; `tomas.guzman@` está pendiente de verificación) |
| Administrador | `admin@tutores.test` |

Las cuentas de administración no se pueden crear desde el registro: en desarrollo las crea el seed y en producción `npm run db:bootstrap` (ver [Despliegue](#despliegue)).

## Scripts

| Script | Uso |
| --- | --- |
| `dev` / `build` / `start` | Desarrollo, build y servidor de producción |
| `lint` / `typecheck` | ESLint y `tsc --noEmit` |
| `test` | Vitest (unitarias de dominio + integración con SQLite en `prisma/test.db`) |
| `db:migrate` | `prisma migrate dev` (crear/aplicar migraciones en desarrollo) |
| `db:deploy` | `prisma migrate deploy` (producción) |
| `db:seed` | Reinicia y carga los datos demo (se niega a correr con `NODE_ENV=production`) |
| `db:reset` | Borra la base de desarrollo y la recrea desde las migraciones |
| `db:bootstrap` | Configuración inicial segura para producción: crea niveles/materias base y el primer administrador (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Se puede repetir sin efectos |
| `docs:manual` | Regenera `manual-de-usuario.html` desde `docs/manual/manual.template.html`, incrustando las capturas de `docs/manual/img/` |

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Ruta SQLite, relativa a `prisma/schema.prisma` (p. ej. `file:./dev.db`) |
| `APP_URL` | URL pública base; se usa en enlaces de recuperación y en la validación de origen (CSRF) |

Se validan al arrancar en `src/lib/env`.

## Despliegue

### Antes de elegir dónde

La app usa **SQLite** y guarda las fotos de perfil en **`storage/`**, así que necesita un servidor Node.js **con disco persistente** y **una sola instancia**:

| Opción | ¿Sirve? |
| --- | --- |
| VPS (Ubuntu en DigitalOcean, Hetzner, Lightsail…) | ✅ Recomendado; pasos abajo |
| Railway / Render / Fly.io **con volumen persistente** | ✅ Monta el volumen y apunta ahí `DATABASE_URL` y `storage/` |
| Vercel, Netlify u otro serverless | ❌ Sin disco persistente: la base y las fotos se perderían. Exigiría migrar a PostgreSQL y a almacenamiento de objetos |

Varias instancias tampoco funcionan: SQLite es un archivo local y el límite de intentos de login vive en memoria.

### Variables de entorno en producción

| Variable | Ejemplo | Notas |
| --- | --- | --- |
| `NODE_ENV` | `production` | Activa la cookie `Secure` y bloquea el seed de demostración |
| `DATABASE_URL` | `file:/var/lib/tutores/tutores.db` | Ruta **absoluta** en disco persistente, fuera de la carpeta del código |
| `APP_URL` | `https://tutores.midominio.com` | Debe ser la URL pública exacta con **HTTPS**; se usa para los enlaces de recuperación y la protección CSRF |
| `PORT` | `3000` | Opcional; puerto de `next start` |

### Pasos en un VPS (Ubuntu + Node 20+)

```bash
# 1. Código y dependencias
git clone <repo> /opt/tutores && cd /opt/tutores
npm ci

# 2. Configuración (crear el archivo; nunca subirlo al repositorio)
sudo mkdir -p /var/lib/tutores && sudo chown $USER /var/lib/tutores
cat > .env <<'EOF'
NODE_ENV=production
DATABASE_URL="file:/var/lib/tutores/tutores.db"
APP_URL="https://tutores.midominio.com"
EOF

# 3. Base de datos y datos iniciales
npm run db:deploy                       # aplica las migraciones (no borra datos)
ADMIN_EMAIL="tu-correo@midominio.com" ADMIN_PASSWORD="UnaClaveSegura123" npm run db:bootstrap

# 4. Fotos de perfil en disco persistente
mkdir -p /var/lib/tutores/storage && ln -sfn /var/lib/tutores/storage ./storage

# 5. Build y arranque
npm run build
npm start                               # escucha en http://localhost:3000
```

**No ejecutes `db:seed` ni `db:reset` en producción**: borran todos los datos. El seed se niega a correr con `NODE_ENV=production`.

Para mantener la app viva y que arranque con el servidor, usa un gestor de procesos, por ejemplo PM2:

```bash
npm install -g pm2
pm2 start npm --name tutores -- start
pm2 save && pm2 startup
```

### HTTPS (obligatorio)

Con `NODE_ENV=production` la cookie de sesión es `Secure`, así que **el inicio de sesión solo funciona por HTTPS**. Pon delante un proxy inverso con certificado. Con Caddy basta este `Caddyfile` (obtiene el certificado automáticamente):

```
tutores.midominio.com {
    reverse_proxy localhost:3000
}
```

Con Nginx, usa `proxy_pass http://localhost:3000;` y Certbot para el certificado.

### Actualizar a una nueva versión

```bash
cd /opt/tutores
git pull
npm ci
npm run db:deploy     # solo aplica migraciones nuevas
npm run build
pm2 restart tutores
```

### Copias de seguridad

Respalda con regularidad **el archivo de la base** (`/var/lib/tutores/tutores.db`) y **la carpeta `/var/lib/tutores/storage`**. Para copiar la base sin detener la app usa `sqlite3 /var/lib/tutores/tutores.db ".backup '/ruta/respaldo.db'"`.

### Pendiente antes de abrir a usuarios reales

- **Correo:** conectar un proveedor real (SMTP, Resend, SES…) en `src/modules/notifications/infrastructure/email.ts`. Hoy el correo de recuperación solo se escribe en el log del servidor.
- **Logotipo:** reemplazar el marcador "TO" por el logotipo definitivo.

## Arquitectura

```
src/
├── app/                      # Rutas (presentación): (auth), student, tutor, admin, api/v1
├── modules/<dominio>/
│   ├── domain/               # Reglas puras y esquemas Zod (sin Next ni Prisma)
│   ├── application/          # Casos de uso; reciben el cliente Prisma por parámetro
│   ├── infrastructure/       # Hash de contraseñas, tokens, almacenamiento, correo
│   └── presentation/         # Server Actions y componentes del dominio
├── components/{ui,shared}/   # UI reutilizable
└── lib/{auth,db,env,api,utils}/
```

Dominios: `auth`, `users`, `tutors`, `subjects`, `availability`, `bookings`, `reviews`, `notifications`.

- **Videollamadas:** la app **no** realiza videollamadas. Al aceptar una tutoría virtual, el profesor pega el enlace de su reunión externa (Meet, Zoom, Teams…) y solo ese enlace se guarda y se muestra al estudiante.
- **Fotos de perfil:** se guardan en `storage/avatars/` (fuera de `public/`) y se sirven por `/api/v1/users/:id/avatar` solo a usuarios autenticados. El tipo se valida por bytes mágicos (PNG/JPG/WebP, máx. 2 MB).
- **Correo:** en desarrollo `LogEmailProvider` escribe el mensaje en el log y reporta `delivered: false`; hay que conectar un proveedor real para producción.

## API REST `/api/v1`

Autenticación por cookie de sesión (`HttpOnly`, `SameSite=Lax`, `Secure` en producción). Las mutaciones rechazan peticiones con `Origin` distinto (CSRF). Errores con formato `{ "error": { "code", "message", "fields?" } }`.

| Método y ruta | Rol | Descripción |
| --- | --- | --- |
| `POST /api/v1/auth/login` | — | `{ email, password }` → crea sesión |
| `POST /api/v1/auth/logout` | cualquiera | Cierra la sesión |
| `GET /api/v1/tutors?q&subjects&minRating&modality&zone&level&weekday&sort&page` | Estudiante, Admin | Búsqueda paginada (6 por página) |
| `GET /api/v1/tutors/:id` | autenticado | Perfil público (sin datos de contacto) |
| `GET /api/v1/tutors/:id/slots?week=0..3` | Estudiante | Bloques de una semana (UTC) con disponibilidad |
| `GET /api/v1/bookings` | Estudiante, Profesor | Tutorías propias |
| `POST /api/v1/bookings` | Estudiante | `{ tutorId, subjectId, modality, startAt, note? }` → `PENDING` |
| `PATCH /api/v1/bookings/:id` | Estudiante, Profesor | `{ action: accept\|reject\|cancel\|complete\|update-meeting, meetingUrl?, meetingPlace? }` |
| `POST /api/v1/bookings/:id/review` | Estudiante | `{ rating: 1..5, comment? }` |
| `GET /api/v1/users/:id/avatar` | autenticado | Foto de perfil |

## Pruebas

`npm test` crea `prisma/test.db` desde las migraciones y ejecuta 52 pruebas: zona horaria y generación de bloques, máquina de estados de reservas, doble reserva (incluido el índice único parcial en BD), permisos por rol y propietario, reseñas, autenticación (hash, enumeración, recuperación, rate limit) y administración.

## Limitaciones conocidas

- Rate limiting en memoria: válido para una sola instancia.
- La reputación y el filtro de puntuación se calculan en la aplicación al consultar (adecuado al volumen académico).
- La zona horaria de estudiantes es la predeterminada (`America/Santo_Domingo`); solo el profesor la elige en Disponibilidad.
- Sin proveedor real de correo/SMS: las notificaciones son internas (campana) y los correos quedan en el log.
