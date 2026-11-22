# Reglas de negocio

Fuente de verdad en código: `src/modules/*/domain` y los casos de uso en `src/modules/*/application`. Cada regla tiene pruebas en `tests/`.

## Cuentas y roles

- Roles: `STUDENT`, `TUTOR`, `ADMIN`. El registro público solo crea estudiantes y profesores.
- Profesores deben ser mayores de 18 años; estudiantes entre 12 y 99.
- Un profesor nuevo queda en verificación `PENDING` y **no aparece en la búsqueda** hasta que un administrador lo aprueba. Solo se aprueba un perfil con descripción (≥ 30 caracteres) y al menos una materia. Si se rechaza, al guardar su perfil vuelve a `PENDING`.
- Un administrador puede suspender cuentas de estudiantes y profesores (no la propia ni otras de administración). La suspensión cierra todas las sesiones activas e impide iniciar sesión.

## Disponibilidad

- Pertenece al profesor y se define como plantilla semanal en **su** zona horaria, con bloques de 60, 90 o 120 minutos entre 8:00 y 20:00.
- Excepciones: fechas locales sin tutorías.
- Cambiar la plantilla no cancela tutorías ya aceptadas; esos bloques se muestran como "Reservado" y no se pueden editar.

## Reservas

Estados: `PENDING → ACCEPTED → COMPLETED`, `PENDING → REJECTED`, `PENDING|ACCEPTED → CANCELLED`.

- Solo un estudiante puede solicitar, a un profesor aprobado y activo, una materia que el profesor enseña y una modalidad que ofrece.
- El horario debe existir en la disponibilidad publicada, no caer en una excepción, empezar al menos **60 minutos** después de la solicitud y estar dentro de las próximas **4 semanas**.
- Un estudiante no puede tener dos solicitudes/tutorías activas que se solapen.
- Varias solicitudes pendientes pueden competir por el mismo bloque. **Aceptar una declina automáticamente las demás** que se solapen y se notifica a esos estudiantes.
- Solo el profesor de la tutoría acepta o rechaza, mientras está `PENDING` y antes de su inicio.
  - Virtual: aceptar exige un **enlace externo `https://`** de la reunión. La videollamada ocurre fuera de la app; solo se guarda el enlace.
  - Presencial: aceptar exige un punto de encuentro, visible solo para el estudiante de esa tutoría. El perfil público muestra únicamente la zona (ciudad/sector).
- **Política de cancelación:** estudiante o profesor pueden cancelar una tutoría `PENDING` o `ACCEPTED` en cualquier momento **antes de que empiece**; se notifica a la otra parte. No hay penalizaciones en esta versión.
- Solo el profesor marca como `COMPLETED` una tutoría `ACCEPTED` cuya hora de inicio ya pasó.

### Concurrencia (SQLite)

Las comprobaciones y escrituras de crear/aceptar se ejecutan en una transacción; SQLite serializa los escritores. Como defensa adicional, la migración `accepted_booking_guard` crea un índice único parcial `(tutorId, startAt) WHERE status = 'ACCEPTED'`, de modo que dos aceptaciones simultáneas del mismo bloque no pueden persistir; la segunda recibe un error de conflicto.

## Reseñas y reputación

- Una reseña por tutoría `COMPLETED`, escrita solo por su estudiante; puntuación entera 1–5 y comentario opcional (≤ 500).
- La reputación (promedio y número) se **calcula** a partir de las reseñas publicadas; no se almacena.
- El profesor puede reportar reseñas sobre sí mismo. El administrador puede ocultarlas, volver a publicarlas o descartar el reporte; **nunca editar la puntuación**. Una reseña oculta deja de contar en el promedio.

## Notificaciones

- Internas (campana) para: nueva solicitud, aceptación, rechazo (manual o automático), cancelación, cambio de enlace/punto de encuentro, tutoría completada, nueva reseña y resultado de la verificación.
- Los correos (recuperación de contraseña) pasan por un proveedor intercambiable; en desarrollo solo se registran en el log y nunca se afirma que fueron enviados.
