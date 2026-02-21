/**
 * Middleware para habilitar CORS en las rutas de API
 * Permite solicitudes desde aplicaciones Ionic/Capacitor
 */

const handler = () => {
  return async (request, response, next) => {
    const origin = request.headers.origin;

    // Orígenes permitidos (desarrollo y producción)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost:8100', // Puerto por defecto de Ionic
    ];

    // Permitir requests de Capacitor (apps nativas) que pueden no tener origen
    // o permitir cualquier origen de localhost
    let allowOrigin = '*'; // Por defecto, permitir todos para apps nativas

    if (origin) {
      // Si hay origen, verificar si está permitido
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('ionic://')
      ) {
        allowOrigin = origin;
      }
    }

    // Headers CORS
    response.setHeader('Access-Control-Allow-Origin', allowOrigin);
    response.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    );
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Cookie, Set-Cookie',
    );

    // Solo permitir credentials si no es wildcard
    if (allowOrigin !== '*') {
      response.setHeader('Access-Control-Allow-Credentials', 'true');
    }

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
