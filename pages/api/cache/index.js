import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import api from '@middleware/api';
import redis from '@lib/cache';
import { invalidateCache } from '@lib/cache/cacheManager';

const handler = nextConnect();

handler
  .use(auth)
  .use(api)
  /** GET /api/cache - Obtener estadisticas del cache */
  .get(async (request, response) => {
    try {
      const info = await redis.info('keyspace');
      const dbSize = await redis.dbsize();
      return response.status(200).json({
        connected: redis.status === 'ready',
        dbSize,
        info,
      });
    } catch (error) {
      return response.status(200).json({
        connected: false,
        message: error.message,
      });
    }
  })
  /** DELETE /api/cache?pattern=courts:* - Invalidar cache por patron */
  .delete(async (request, response) => {
    try {
      const { pattern } = request.query;

      if (pattern) {
        await invalidateCache(pattern);
        return response
          .status(200)
          .json({ message: `Cache invalidado para patron: ${pattern}` });
      }

      // Sin patron: limpiar todo el cache
      await redis.flushdb();
      return response
        .status(200)
        .json({ message: 'Todo el cache ha sido limpiado' });
    } catch (error) {
      return response
        .status(500)
        .json({ message: error.message || 'Error al limpiar cache' });
    }
  })
  /** PUT /api/cache - Refrescar cache de un recurso especifico */
  .put(async (request, response) => {
    const { resource } = request.body;
    const validResources = [
      'courts',
      'menus',
      'access',
      'roles',
      'schedules',
      'bookings',
    ];

    if (!resource || !validResources.includes(resource)) {
      return response.status(400).json({
        message: `Recurso invalido. Opciones: ${validResources.join(', ')}`,
      });
    }

    try {
      await invalidateCache(`${resource}:*`);
      await invalidateCache(`public:${resource}:*`);
      return response.status(200).json({
        message: `Cache del recurso '${resource}' refrescado exitosamente`,
        invalidated: [`${resource}:*`, `public:${resource}:*`],
      });
    } catch (error) {
      return response
        .status(500)
        .json({ message: error.message || 'Error al refrescar cache' });
    }
  });

export default handler;
