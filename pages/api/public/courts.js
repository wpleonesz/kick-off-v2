import nextConnect from 'next-connect';
import cors from '@middleware/cors';
import CourtsData from '@database/courts';
import schemas from '@database/courts/schemas';
import { getCache, setCache, TTL } from '@lib/cache/cacheManager';

const handler = nextConnect();

handler.use(cors).get(async (request, response) => {
  try {
    const cacheKey = 'public:courts:all';
    const cached = await getCache(cacheKey);
    if (cached) return response.status(200).json(cached);

    const courtsData = new CourtsData();
    const courts = await courtsData
      .select(schemas.DEFAULT)
      .where({
        active: true,
      })
      .getAll();

    await setCache(cacheKey, courts, TTL.COURTS_ALL);
    response.status(200).json(courts);
  } catch (error) {
    console.error('Error al obtener canchas:', error);
    response.status(500).json({
      message: error.message || 'Error al obtener las canchas',
    });
  }
});

export default handler;
