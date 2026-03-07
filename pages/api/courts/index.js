import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import api from '@middleware/api';
import database from '@middleware/database';
//import access from '@middleware/access';
import CourtsData from '@database/courts';

const handler = nextConnect();

handler
  .use(auth)
  .use(api)
  //.use(access('entity'))
  .use(database(CourtsData))
  .get((request) => {
    request.do('read', async (api, prisma) => {
      try {
        const result = await prisma.courts.getAll();
        return api.successMany(result);
      } catch (error) {
        console.log(error);
        return api.failure('Error fetching courts data', error);
      }
    });
  })
  .post((request) => {
    request.do('create', async (api, prisma) => {
      try {
        const response = await prisma.courts
          .invalidates(['public:courts:*', 'courts:*'])
          .create(request.body);
        return api.success(response);
      } catch (error) {
        console.log(error);
        return api.failure('Error creating courts record', error);
      }
    });
  });

export default handler;
