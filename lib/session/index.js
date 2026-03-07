import Iron from '@hapi/iron';
import { parse, serialize } from 'cookie';

/** Crea la sesión en base al request y el la llave recibida  */
const createLoginSession = async (req, secret) => {
  const createdAt = Date.now();
  const device = req.headers['device-uuid'];
  const shouldExpire = req.headers['should-expire'];
  const obj = { ...req.session, createdAt, device, shouldExpire };
  const token = await Iron.seal(obj, secret, Iron.defaults);
  return token;
};

/** Retorna la sesión en base al token, llave y dispositivo indicados */
const getLoginSession = async (token, secret, device) => {
  const session = await Iron.unseal(token, secret, Iron.defaults);
  if (session.device !== device)
    throw new Error('Dispositivo no reconocido para esta sesión');
  if (session.device && session.shouldExpire === 'never') return session;
  const expiresAt = session.createdAt + session.maxAge * 1000;
  if (session.maxAge && Date.now() > expiresAt) {
    return {};
  }
  return session;
};

/** Retorna la cookie del request especificado */
const parseCookies = (req) => {
  if (req.cookies) return req.cookies;
  const cookie = req.headers?.cookie;
  return parse(cookie || '');
};

/** Middleware que comprueba y crea la sesión de ser necesario, además de gestionar
 * los errores generados */
const session = ({ name, secret, cookie: cookieOpts }) => {
  return async (req, res, next) => {
    if (req.headers['should-expire'] === 'never') {
      cookieOpts.maxAge = null;
    }
    const cookies = parseCookies(req);
    const token = cookies[name];
    let unsealed = {};
    if (token) {
      try {
        const device = req.headers['device-uuid'];
        unsealed = await getLoginSession(token, secret, device);
      } catch (error) {
        // Si la cookie es inválida/corrupta, limpiarla y continuar con sesión vacía
        // Esto permite que el usuario pueda hacer signin de nuevo
        console.warn('Session unseal failed, clearing invalid cookie:', error.message);
        res.setHeader(
          'Set-Cookie',
          serialize(name, '', { ...cookieOpts, maxAge: 0 }),
        );
        unsealed = {};
      }
    }
    req.session = unsealed;
    const oldEnd = res.end;
    res.end = async function resEndProxy(...args) {
      if (res.finished || res.writableEnded || res.headersSent) return;
      if (cookieOpts.maxAge) {
        req.session.maxAge = cookieOpts.maxAge;
      }
      const token = await createLoginSession(req, secret);
      res.setHeader('Set-Cookie', serialize(name, token, cookieOpts));
      oldEnd.apply(this, args);
    };
    next();
  };
};

export default session;
