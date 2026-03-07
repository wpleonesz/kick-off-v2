import prisma from '@database/client';

export const handleAuditLog = async (data) => {
  await prisma.audit_log.create({ data });
};
