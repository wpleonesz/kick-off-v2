┌────────┬─────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Método │ URL │ Acción │
├────────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ GET │ /api/cache │ Ver estadísticas (tamaño, estado de conexión) │
├────────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ DELETE │ /api/cache?pattern=courts:\* │ Invalidar cache por patrón (sin patrón = limpiar todo) │
├────────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ PUT │ /api/cache con { "resource": "courts" } │ Refrescar cache de un recurso específico │
└────────┴─────────────────────────────────────────┴────────────────────────────────────────────────────────┘

Ejemplos de uso:

# Ver estado del cache

GET /api/cache

# Limpiar cache de canchas

DELETE /api/cache?pattern=courts:\*

# Limpiar TODO el cache

DELETE /api/cache

# Refrescar cache de un recurso (courts, menus, access, roles, schedules, bookings)

PUT /api/cache body: { "resource": "courts" }
