/**
 * Middleware para habilitar CORS en las rutas de API
 * Permite solicitudes desde aplicaciones Ionic/Capacitor
 */

const handler = () => {
  return async (request, response, next) => {
    const origin = request.headers.origin;

    // Orígenes permitidos (desarrollo y producción)
    const allowedOrigins = ['http://localhost:3000', 'http://localhost'];

    const allowOrigin = allowedOrigins.includes(origin)
      ? origin
      : 'http://localhost:3000';

    // Headers CORS
    response.setHeader('Access-Control-Allow-Origin', allowOrigin);
    response.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    );
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With',
    );
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Max-Age', '3600');

    // Manejar preflight requests (OPTIONS)
    if (request.method === 'OPTIONS') {
      return response.status(200).end();
    }

    next();
  };
};

import nextConnect from 'next-connect';

const cors = nextConnect().use(handler());

export default cors;
