# AGENTS.md — TutoresOn-Line

## 1. Contexto del proyecto

TutoresOn-Line es una plataforma web para conectar estudiantes con tutores calificados en diferentes materias y niveles educativos. Los estudiantes pueden buscar tutores, consultar sus perfiles y reservar tutorías; los tutores pueden administrar su disponibilidad y aceptar o rechazar solicitudes.

El sistema contempla tutorías virtuales y presenciales, búsqueda por materia/nivel/ubicación/disponibilidad, reservas, reputación y calificaciones, notificaciones e integración de videoconferencia.

## 2. Stack y decisiones técnicas

- **Framework:** Next.js con App Router.
- **Rendering:** priorizar SSR y React Server Components. Usar Client Components solo cuando la interacción en navegador lo requiera.
- **Lenguaje:** TypeScript estricto.
- **Base de datos:** SQLite para desarrollo y alcance académico inicial.
- **ORM:** Prisma; mantener schema, migraciones y acceso a datos tipados. No escribir SQL disperso por la aplicación.
- **Autenticación:** sesiones seguras con cookies `HttpOnly`, `Secure` en producción, `SameSite` apropiado y expiración. Implementar autenticación con una solución mantenida (preferir Auth.js si encaja con el flujo); no almacenar contraseñas en texto plano.
- **Validación:** Zod para validar entradas en límites de API, formularios, Server Actions y servicios.
- **UI:** React para interfaces, Tailwind CSS para estilos, componentes reutilizables y accesibles. No acoplar la lógica de negocio a la UI.
- **API:** exponer endpoints REST versionados bajo `/api/v1` cuando la funcionalidad deba servir a clientes externos o móviles. Server Actions pueden usarse para acciones internas de la interfaz, sin reemplazar la API pública requerida por el proyecto.

No cambies el stack ni agregues dependencias importantes sin justificarlo y actualizar este documento.

### Decisiones tomadas (noviembre 2026)

- **Versiones:** Next.js 15 (App Router), React 19, Prisma 6 (SQLite con enums), Tailwind CSS 4, Zod 3.
- **Autenticación:** sesiones propias respaldadas en base de datos (`Session`: se guarda solo el SHA-256 del token; cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción, 7 días) en `src/lib/auth/session.ts`. Se descartó Auth.js porque el único método es correo + contraseña, y su proveedor de credenciales obliga a sesiones JWT, lo que impide revocar sesiones al suspender una cuenta o cambiar la contraseña.
- **Hash de contraseñas:** Argon2id con `@node-rs/argon2` (binarios precompilados, sin toolchain nativo).
- **Pruebas:** Vitest; `tsx` ejecuta el seed.
- **Videollamadas:** fuera de la app. Solo se guarda el enlace externo (`https://`) que el profesor indica al aceptar; no hay integración con proveedores.
- **Archivos subidos:** fotos de perfil en `storage/avatars/`, servidas por la API con autenticación.
- **Reglas de reservas, cancelación y concurrencia:** documentadas en `docs/business-rules.md`.


## 3. Principios de arquitectura

Usa una arquitectura modular por dominio con separación de responsabilidades y capas. Aplica SOLID, DRY con criterio, y evita abstraer antes de que exista una necesidad real.


### Responsabilidades por capa

- **Presentation:** páginas, layouts, componentes, formularios y estados visuales. No contiene consultas directas a Prisma ni reglas de negocio complejas.
- **Application:** casos de uso y orquestación de operaciones (crear reserva, aceptar solicitud, publicar disponibilidad, etc.).
- **Domain:** entidades, tipos, reglas, estados y validaciones de negocio que no dependan de Next.js, Prisma o la UI.
- **Infrastructure:** Prisma, repositorios, servicios externos, correo y videollamadas.
- **Shared:** utilidades realmente compartidas, componentes UI comunes, constantes y tipos generales. Evitar convertir `shared` en un depósito de código sin dueño.


### Estructura de carpetas sugerida

```text
src/
├── app/
│   ├── (public)/                 # Landing, búsqueda pública, perfiles públicos
│   ├── (auth)/                  # Login, registro, recuperación de acceso
│   ├── (student)/               # Área del estudiante
│   ├── (tutor)/                 # Área del tutor
│   ├── admin/                   # Administración (si aplica)
│   ├── api/v1/                  # API REST versionada
│   ├── layout.tsx
│   └── globals.css
├── modules/
│   ├── auth/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── users/
│   ├── tutors/
│   ├── subjects/
│   ├── availability/
│   ├── bookings/
│   ├── reviews/
│   ├── notifications/
│   ├── sessions/                 # Tutorías virtuales/presenciales
├── components/
│   ├── ui/                       # UI genérica reutilizable
│   └── shared/                    # Componentes de aplicación compartidos
├── lib/
│   ├── auth/                      # Helpers de autenticación y autorización
│   ├── db/                         # Cliente Prisma
│   ├── env/                         # Validación de variables de entorno
│   └── utils/
├── config/
└── types/
prisma/
├── schema.prisma
└── migrations/
```

Ajusta la estructura si el proyecto lo necesita, pero conserva la separación de dominios y responsabilidades. No crees carpetas vacías solo por cumplir el esquema.


## 4. Reglas de Next.js y SSR

- Usa App Router; no introduzcas Pages Router.
- Por defecto, componentes de React deben ser **Server Components**.
- Agrega `'use client'` únicamente para estado/interacción del navegador, hooks cliente, APIs del navegador o librerías que lo requieran.
- Obtén datos en el servidor siempre que sea posible. Evita hacer desde el cliente una petición a una ruta API de tu propia aplicación para recuperar datos que el Server Component puede obtener directamente mediante un caso de uso.
- No uses `useEffect` para cargar datos iniciales que pueden resolverse en servidor.
- Usa loading, error y empty states claros mediante `loading.tsx`, `error.tsx`, `not-found.tsx` o estados de UI según corresponda.
- Mantén los secretos, operaciones de base de datos y módulos exclusivos de servidor fuera del bundle cliente. Usa `server-only` donde ayude a prevenir importaciones incorrectas.
- No fuerces renderizado dinámico ni caching sin entender el impacto. Las páginas que dependen de sesión, datos privados o información en tiempo real deben configurarse de manera que no filtren ni reutilicen contenido privado entre usuarios.
- El SSR no reemplaza la autorización: verifica permisos en cada operación protegida.


## 5. Autenticación, sesiones y permisos

- Implementa registro, inicio de sesión, cierre de sesión y recuperación de contraseña si está dentro del alcance.
- Soporta al menos los roles **STUDENT** y **TUTOR**. Si se requiere administración, agrega **ADMIN** de forma explícita.
- Verifica el rol y la propiedad del recurso en el servidor; ocultar botones en UI no es control de acceso.
- Nunca confíes en un `userId`, rol, precio, estado de reserva o dato sensible enviado por el cliente sin validarlo contra la sesión y la base de datos.
- Hashea contraseñas con un algoritmo seguro y mantenido (Argon2id preferido, o bcrypt con configuración adecuada). Nunca guardes contraseñas reversibles.
- Evita enumeración de usuarios en registro y recuperación. Aplica límites de intentos/rate limiting donde sea viable.
- Mantén secretos en variables de entorno; no los incluyas en el repositorio ni en logs.
- Centraliza helpers como `getCurrentUser()`, `requireUser()` y verificaciones de rol, sin hacer que la UI sea responsable de la seguridad.


## 6. Base de datos SQLite y Prisma

- SQLite es la base de datos inicial; Prisma es el único acceso ORM de la aplicación.
- Define modelos y relaciones en `prisma/schema.prisma`; conserva las migraciones versionadas.
- No alteres la base de datos manualmente para cambios que deban quedar reproducibles: crea migraciones.
- Usa claves primarias, relaciones, índices y restricciones adecuadas. Agrega índices a campos utilizados en filtros, búsquedas y relaciones frecuentes.
- Guarda fechas en UTC y convierte a la zona horaria local solo para presentación y reglas de calendario.
- Usa transacciones cuando una operación modifique varios registros que deban mantenerse consistentes (por ejemplo, confirmar una reserva y bloquear el horario).
- Evita duplicados y reservas superpuestas con validaciones de negocio y controles de consistencia en servidor. Considera que SQLite tiene limitaciones de concurrencia; documenta las decisiones para reservas simultáneas.
- Usa datos semilla reproducibles para desarrollo/demo; no agregues datos de prueba a producción.
- No guardes campos derivados (como promedio de calificaciones) sin justificar estrategia de consistencia.


## 7. Dominios y reglas de negocio

### Usuarios y perfiles
- Un usuario tiene identidad, credenciales, rol y perfil correspondiente.
- No expongas datos personales o de contacto privados en perfiles públicos.
- Los tutores deben poder registrar materias, niveles que enseñan, descripción, modalidad y datos de perfil necesarios.

### Búsqueda de tutores
- Permite filtrar por materia, nivel educativo, modalidad, área geográfica cuando sea presencial y disponibilidad.
- Valida filtros y parámetros; aplica paginación y ordenamiento estable.
- No implementes geolocalización precisa si el caso de uso solo necesita ciudad/sector.

### Disponibilidad
- La disponibilidad pertenece al tutor.
- Define claramente zona horaria, duración de los bloques, intervalos y excepciones.
- Evita que una disponibilidad publicada permita reservar un bloque que ya esté ocupado o haya dejado de estar disponible.

### Reservas
- La reserva tiene estudiante, tutor, horario, modalidad, estado y datos de sesión necesarios.
- Define estados explícitos (por ejemplo: PENDING, ACCEPTED, REJECTED, CANCELLED, COMPLETED); no uses strings libres.
- Verifica que el tutor esté disponible, que el estudiante no esté reservando consigo mismo y que no existan conflictos de horario.
- Las transiciones de estado deben pasar por casos de uso; no permitas que el cliente cambie arbitrariamente el estado.
- Documenta política de cancelación y reglas de aceptación antes de codificarlas.

### Reputación y reseñas
- Solo permite reseñas asociadas a tutorías válidas/completadas y al estudiante correspondiente.
- Valida rango de puntuación, por ejemplo 1–5, y evita reseñas duplicadas según la política definida.
- No permitas que un usuario modifique la reputación directamente.

### Sesiones
- Distingue modalidad virtual y presencial.
- Para sesiones presenciales, conserva solo la información de ubicación necesaria y protege datos privados.
- Para videoconferencia, integra un proveedor mediante una interfaz/adaptador; no acoples el dominio a un proveedor específico.

### Notificaciones
- Diseña notificaciones como eventos o servicios desacoplados de la reserva.
- En desarrollo, usa un proveedor mock o logs controlados; para producción, configura proveedor real.
- No afirmes que un correo, SMS o WhatsApp fue enviado si el proveedor no confirmó el envío.


## 7. API REST

- Usa `/api/v1` para endpoints REST.
- Mantén rutas delgadas: validar entrada, autenticar/autorización y delegar en un caso de uso.
- Usa DTOs o schemas de entrada/salida; no expongas directamente modelos Prisma completos.
- Responde con códigos HTTP adecuados y un formato de error consistente. No filtres stack traces ni detalles internos al cliente.
- Documenta endpoints, parámetros, permisos y ejemplos (OpenAPI si el alcance lo permite).
- Protege mutaciones frente a CSRF según el mecanismo de sesión y las rutas usadas; valida el origen cuando corresponda.
- No hagas lógica de negocio extensa en Route Handlers.


## 8. Código y convenciones

- TypeScript estricto; evita `any`. Si un tipo es desconocido, usa `unknown` y valida.
- Usa nombres claros en inglés para código (variables, funciones, clases, modelos, rutas y archivos). La interfaz puede estar en español.
- Componentes React en PascalCase; funciones y variables en camelCase; constantes compartidas en UPPER_SNAKE_CASE solo cuando corresponda.
- Prefiere funciones pequeñas, con una responsabilidad clara y nombres que expresen intención.
- No dupliques reglas de negocio en páginas, componentes, Route Handlers y Server Actions.
- No uses patrones de repositorio o factories por moda: aplícalos cuando simplifiquen el dominio, permitan pruebas o desacoplen infraestructura.
- Evita archivos monolíticos; divide por dominio y responsabilidad cuando el tamaño lo justifique.
- Maneja errores explícitamente; no uses `catch` vacío ni ignores errores silenciosamente.
- Evita comentarios que repitan el código. Comenta decisiones, restricciones o lógica no obvia.
- No agregues dependencias para resolver algo que pueda hacerse de manera simple con el stack actual, salvo que aporte valor claro.


## 9. React, Tailwind CSS, UI/UX y accesibilidad

- La interfaz debe ser responsive y usable en móvil, tablet y escritorio.
- Usa React para construir componentes funcionales y reutilizables; evita componentes enormes con múltiples responsabilidades.
- Usa Tailwind CSS como sistema principal de estilos; evita CSS inline o estilos aislados salvo que exista una razón concreta.
- Mantén una jerarquía visual consistente, reutiliza patrones de diseño y centraliza variantes de componentes cuando sea útil.
- Usa labels asociados a controles, navegación por teclado, focus visible, semántica HTML y mensajes de validación comprensibles.
- Formularios deben tener validación cliente para experiencia y validación servidor para seguridad.
- Indica estados de carga, éxito, error, vacío y confirmación en operaciones importantes.
- Evita bloquear la página con interacciones innecesarias; conserva feedback claro para reservas y cambios de disponibilidad.
- No uses datos ficticios en pantallas de producción. Los mocks deben estar claramente aislados y señalados.


## 10. Testing y calidad

- Prueba reglas de dominio y casos de uso, especialmente reservas, disponibilidad, permisos y transición de estados.
- Incluye pruebas de integración para persistencia y endpoints críticos.
- Incluye pruebas de autenticación y autorización: usuario no autenticado, rol incorrecto, propietario incorrecto y acceso permitido.
- Prioriza pruebas de conflictos de horario, doble reserva, cancelaciones y reseñas inválidas.
- Ejecuta lint, typecheck y pruebas antes de considerar una tarea terminada.
- No des por terminada una tarea si los tests fallan; reporta claramente los fallos que no pudiste resolver.


## 11. Variables de entorno y configuración

- Mantén `.env.example` actualizado con nombres de variables y valores placeholder, nunca credenciales reales.
- Valida variables de entorno al inicio mediante un módulo central.
- No accedas a secretos desde componentes cliente.
- Documenta pasos para configurar la base de datos, ejecutar migraciones, seed y arrancar el proyecto.


## 12. Flujo de trabajo del agente

Antes de modificar código:
1. Inspecciona la estructura actual y los archivos relevantes.
2. Identifica el módulo y las capas afectadas.
3. Comprueba si existe una implementación reutilizable.
4. Resume brevemente el plan si la tarea es grande o cambia arquitectura/esquema.

Al implementar:
1. Mantén los cambios acotados al alcance solicitado.
2. Define o actualiza schemas de validación y tipos.
3. Implementa reglas en dominio/casos de uso, no en la UI.
4. Actualiza Prisma y crea migración si cambia la base de datos.
5. Añade o actualiza pruebas.
6. Actualiza documentación cuando cambie un flujo, API, configuración o decisión técnica.

Al finalizar:
- Resume qué cambió y dónde.
- Indica comandos de migración, ejecución o prueba relevantes.
- Reporta limitaciones, decisiones pendientes y pruebas que no se ejecutaron.
- No inventes resultados de comandos ni afirmes que algo fue probado si no lo ejecutaste.


## 13. Comandos y scripts esperados

Mantén scripts equivalentes en `package.json` (ajusta los nombres si el proyecto ya tiene convenciones):

- `dev`: servidor local de desarrollo.
- `build`: build de producción.
- `start`: servidor de producción.
- `lint`: análisis estático.
- `typecheck`: chequeo de TypeScript.
- `test`: pruebas automatizadas.
- `db:migrate`: migraciones de base de datos.
- `db:seed`: carga de datos iniciales de desarrollo.

No supongas que estos scripts existen: revisa `package.json` y créalos cuando corresponda.


## 14. Prioridades de desarrollo

Construye incrementalmente, evitando empezar por integraciones complejas:

1. Estructura base, configuración, SQLite/Prisma y UI base.
2. Registro, inicio/cierre de sesión y roles.
3. Perfiles de tutores y materias.
4. Búsqueda y filtros.
5. Disponibilidad y reservas con validación de conflictos.
6. Gestión de solicitudes para tutores y paneles por rol.
7. Reseñas y reputación.
8. Notificaciones por correo/mensaje.
9. Tutorías virtuales/presenciales y proveedor de videollamadas.
10. Pruebas integrales, documentación, despliegue y propuesta comercial.

Las funcionalidades opcionales, como reserva de tutor en tiempo real tipo marketplace, deben abordarse después de completar y estabilizar el flujo principal de reservas.

## 15. Definition of Done

Una tarea se considera terminada cuando:
- Cumple el requerimiento y sus criterios de aceptación.
- Respeta la arquitectura y reglas de este documento.
- Tiene validación de datos y autorización del lado servidor cuando aplica.
- No introduce errores de TypeScript ni lint (o documenta los existentes).
- Incluye pruebas relevantes, ejecutadas y con resultados reportados.
- La UI contempla estados de carga, error, vacío y éxito cuando corresponde.
- La documentación y migraciones están actualizadas si hubo cambios.
- No contiene secretos, datos sensibles en logs ni placeholders sin señalar.
