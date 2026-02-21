import nextConnect from 'next-connect';
import cors from '@middleware/cors';
import CourtsData from '@database/courts';
import schemas from '@database/courts/schemas';

const handler = nextConnect();

handler.use(cors).get(async (request, response) => {
  try {
    const courtsData = new CourtsData();
    const courts = await courtsData
      .select(schemas.DEFAULT)
      .where({
        active: true,
      })
      .getAll();

    response.status(200).json(courts);
  } catch (error) {
    console.error('Error al obtener canchas:', error);
    response.status(500).json({
      message: error.message || 'Error al obtener las canchas',
    });
  }
});

export default handler;
