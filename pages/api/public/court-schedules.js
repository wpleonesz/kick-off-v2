import nextConnect from 'next-connect';
import cors from '@middleware/cors';
import CourtScheduleData from '@database/courts/schedules';
import schemas from '@database/courts/schedules/schemas';

const handler = nextConnect();

handler.use(cors).get(async (request, response) => {
  try {
    const { courtId } = request.query;
    const scheduleData = new CourtScheduleData();

    // Construir condiciones de búsqueda
    const whereConditions = { active: true };

    // Filtrar por cancha específica si se proporciona courtId
    if (courtId) {
      whereConditions.courtId = parseInt(courtId);
    }

    const schedules = await scheduleData
      .select(schemas.DEFAULT)
      .where(whereConditions)
      .getAll();

    response.status(200).json(schedules);
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    response.status(500).json({
      message: error.message || 'Error al obtener los horarios',
    });
  }
});

export default handler;
