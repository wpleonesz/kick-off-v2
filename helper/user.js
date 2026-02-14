import PersonData from '@database/base/person';
import UserData from '@database/base/user';
import RolesOnUsers from '@database/base/RolesOnUsers';
import schemas from '@database/base/user/schemas';
import { smtpSever } from '@lib/mail/server';
import { hash } from '@lib/hash';
import { dates } from '@lib/dates';
import { toInteger } from 'lodash';

const login = async (username, password) => {
  const userData = new UserData();
  const user = await userData
    .select(schemas.CREDENTIALS)
    .where({
      username: username,
      password: hash.create(password),
    })
    .getFirst();

  if (!user) throw new Error('Usuario o contraseña incorrectos');
  if (!user.active)
    throw new Error(
      'Su cuenta se encuentra desactivada, si este no debería ser el caso por favor comuníquese con el administrador',
    );

  return {
    id: user.id,
    username: user.username,
    name: user.Person?.name || user.username,
    dni: user.Person?.dni,
    email: user.email,
    roles: (user.roles || []).map(r => ({
      id: r.Role?.id,
      code: r.Role?.code,
      name: r.Role?.name,
    })),
  };
};

const createRecoverToken = async (
  prisma,
  userId,
  personalEmail,
  userEmail,
  personalName,
  username,
  institution,
) => {
  const recoverDate = new Date();
  const now = dates.toString(recoverDate);
  const recoverToken = hash.create(`${personalEmail}${now}`);
  await prisma.user.record(userId).update({ recoverToken, recoverDate });
  await smtpSever.sendMAilServerNotification(
    personalEmail,
    userEmail,
    personalName,
    username,
    recoverToken,
    institution,
    'No fue posible enviar el correo de recuperación, por favor intente mas tarde',
  );
};

const createUser = async (data) => {
  try {
    const personData = new PersonData();
    const person = await personData.create({
      dni: data.dni,
      name: data.name,
      email: data.email,
      lastName: data.lastName,
      firstName: data.firstName,
      mobile: data.mobile,
    });

    const userData = new UserData();
    const user = await userData.create({
      username: data.username,
      password: hash.create(data.password),
      email: data.email,
      personId: toInteger(person.id),
    });

    // Asignar rol si se proporcionó
    if (data.roleId) {
      const rolesOnUsers = new RolesOnUsers();
      await rolesOnUsers.create({
        roleId: toInteger(data.roleId),
        userId: toInteger(user.id),
        active: true,
      });
    }

    return { user, person };
  } catch (error) {
    throw new Error(`Ocurrió un error al crear el usuario: ${error.message}`);
  }
};

export const userHelper = {
  login,
  createRecoverToken,
  createUser,
};
