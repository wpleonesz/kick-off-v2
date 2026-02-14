import nextConnect from 'next-connect';
import cors from '@middleware/cors';
import RoleData from '@database/base/role';
import schemas from '@database/base/role/schemas';

const handler = nextConnect();
const KICKOFF_CODES = ['player', 'referee', 'organizer', 'owner'];

handler.use(cors).get(async (request, response) => {
  try {
    const roleData = new RoleData();
    const roles = await roleData
      .select(schemas.ROLES)
      .where({
        active: true,
        code: { in: KICKOFF_CODES },
      })
      .getAll();

    response.status(200).json(roles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    response.status(500).json({
      message: error.message || 'Error al obtener los roles',
    });
  }
});

export default handler;
