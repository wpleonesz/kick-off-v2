import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import api from '@middleware/api';
import database from '@middleware/database';
//import access from '@middleware/access';
import CourtScheduleData from '@database/courts/schedules';

const handler = nextConnect();

handler
  .use(auth)
  .use(api)
  //.use(access('entity'))
  .use(database(CourtScheduleData))
  .get((request) => {
    request.do('read', async (api, prisma) => {
      try {
        const result = await prisma.courtSchedules
          .record(request.query.id)
          .getUnique();
        return api.successOne(result);
      } catch (error) {
        console.log(error);
        return api.failure('Error fetching court data', error);
      }
    });
  })
  .put((request) => {
    request.do('write', async (api, prisma) => {
      try {
        const response = await prisma.courtSchedules
          .record(request.query.id)
          .update(request.body);
        return api.success(response);
      } catch (error) {
        return api.failure('Error updating court record', error);
      }
    });
  })
  .delete((request) => {
    request.do('remove', async (api, prisma) => {
      try {
        const response = await prisma.courtSchedules
          .record(request.query.id)
          .update({ active: false });
        return api.success(response);
      } catch (error) {
        return api.failure('Error deleting court record', error);
      }
    });
  });

export default handler;
