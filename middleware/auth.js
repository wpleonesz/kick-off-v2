import nextConnect from 'next-connect';
import passport from '@lib/passport';
import session from '@lib/session';

/** Middleware para controlar el inicio de sesión */
const auth = nextConnect()
  .use(
    session({
      name: 'session',
      secret: process.env.TOKEN_SECRET,
      cookie: {
        maxAge: 60 * 60 * 8, // 8 hours
        httpOnly: true,
        // FIXME: secure only works with secure connection, DEV_SESSION should not be used
        secure:
          process.env.NODE_ENV === 'production' && !process.env.DEV_SESSION,
        path: '/',
        sameSite: 'lax',
      },
    }),
  )
  .use(passport.initialize())
  .use(passport.session())
  .use((request, response, next) => {
    if (request.method === 'POST' && request.url === '/api/auth/signin')
      return next();
    if (request.method === 'POST' && request.url === '/api/auth/signup')
      return next();
    if (request.method === 'GET' && request.url === '/api/auth/signout')
      return next();
    if (!request.user)
      return response.status(403).json({ message: 'No autorizado' });
    next();
  });

export default auth;
