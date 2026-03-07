import nextConnect from 'next-connect';
import database from '@middleware/database';
import AccessData from '@database/base/access';
import { getCache, setCache, TTL } from '@lib/cache/cacheManager';

const handler = (entityCode) => {
  return async (request, _, next) => {
    if (request.user) {
      // FIXME: Admin shouldn't be on code
      if (request.user.id === 1) return next();

      const cacheKey = `access:entity:${request.user.id}:${entityCode}`;
      const cached = await getCache(cacheKey);

      if (cached) {
        if (cached.length === 0)
          request.access = { Entity: { code: entityCode } };
        else request.access = cached[0];
      } else {
        const db = request.db.access;
        const access = await db
          .user(request.user)
          .entities([entityCode])
          .getAll();
        await setCache(cacheKey, access, TTL.USER_ACCESS);
        if (access.length == [])
          request.access = { Entity: { code: entityCode } };
        else if (access.length > 0) request.access = access[0];
      }
    }
    next();
  };
};

/** Middleware para realizar el control de accesos a las API por entidad
 * @param entityCode Código de la entidad a controlar
 */
const access = (entityCode) => {
  return nextConnect().use(database(AccessData)).use(handler(entityCode));
};

export default access;
