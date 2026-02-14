import nextConnect from 'next-connect';
import cors from '@middleware/cors';
import auth from '@middleware/auth';
import api from '@middleware/api';
import database from '@middleware/database';
import UserData from '@database/base/user';

const handler = nextConnect();

handler
  .use(cors)
  .use(auth)
  .use(api)
  .use(database(UserData))
  .get((request) => {
    request.do(null, async (api, prisma) => {
      api.successOne(await prisma.user.record(request.user.id).getUnique());
    });
  });

export default handler;
