import { smtpSever } from '@lib/mail/server';

export const handleRecoverPassword = async (data) => {
  const {
    personalEmail,
    userEmail,
    personalName,
    username,
    recoverToken,
    institution,
    customError,
  } = data;
  await smtpSever.sendMAilServerNotification(
    personalEmail,
    userEmail,
    personalName,
    username,
    recoverToken,
    institution,
    customError,
  );
};

export const handleNotificationAssign = async (data) => {
  const {
    code,
    name,
    reason,
    type,
    email,
    emailInstitucional,
    reemplace,
    customError,
  } = data;
  await smtpSever.NotificationAssing(
    code,
    name,
    reason,
    type,
    email,
    emailInstitucional,
    reemplace,
    customError,
  );
};
