import nextConnect from 'next-connect';
import cors from '@middleware/cors';
import auth from '@middleware/auth';
import passport from '@lib/passport';

const handler = nextConnect();

handler.use(cors).use(auth).post(passport.authenticate('local'), (request, response) => {
  if (!request.user)
    return response.status(405).json({ message: 'No permitido' });
  if (request.user.error)
    return response.status(400).json({ message: request.user.message });
  response.status(200).json(request.user);
});

export default handler;
