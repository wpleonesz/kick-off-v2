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
        const result = await prisma.courtSchedules.getAll();
        return api.successMany(result);
      } catch (error) {
        console.log('Error estas aqui=>', error);
        return api.failure('Error fetching court schedules data', error);
      }
    });
  })
  .post((request) => {
    request.do('create', async (api, prisma) => {
      try {
        const response = await prisma.courtSchedules.create(request.body);
        return api.success(response);
      } catch (error) {
        console.log(error);
        return api.failure('Error creating court schedule record', error);
      }
    });
  });

export default handler;
