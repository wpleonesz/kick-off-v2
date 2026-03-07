import DataLoader from 'dataloader';
import prisma from '@database/client';

const createRoleLoader = () =>
  new DataLoader(async (ids) => {
    const roles = await prisma.base_role.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        moduleId: true,
        active: true,
        Module: { select: { id: true, name: true } },
      },
    });
    const roleMap = new Map(roles.map((r) => [r.id, r]));
    return ids.map((id) => roleMap.get(id) || null);
  });

const createUserLoader = () =>
  new DataLoader(async (ids) => {
    const users = await prisma.base_user.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        username: true,
        email: true,
        active: true,
        Person: { select: { name: true, dni: true } },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => userMap.get(id) || null);
  });

const createAccessByRoleLoader = () =>
  new DataLoader(async (roleIds) => {
    const accessRecords = await prisma.base_access.findMany({
      where: { roleId: { in: [...roleIds] } },
      select: {
        id: true,
        roleId: true,
        read: true,
        create: true,
        write: true,
        remove: true,
        active: true,
        Entity: { select: { name: true } },
      },
    });
    const grouped = new Map();
    roleIds.forEach((id) => grouped.set(id, []));
    accessRecords.forEach((record) => {
      const list = grouped.get(record.roleId);
      if (list) list.push(record);
    });
    return roleIds.map((id) => grouped.get(id) || []);
  });

const createMenuLoader = () =>
  new DataLoader(async (ids) => {
    const menus = await prisma.base_menu.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        name: true,
        Page: { select: { url: true } },
      },
    });
    const menuMap = new Map(menus.map((m) => [m.id, m]));
    return ids.map((id) => menuMap.get(id) || null);
  });

const createCourtLoader = () =>
  new DataLoader(async (ids) => {
    const courts = await prisma.courts.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        name: true,
        location: true,
        latitude: true,
        longitude: true,
        isIndoor: true,
        active: true,
      },
    });
    const courtMap = new Map(courts.map((c) => [c.id, c]));
    return ids.map((id) => courtMap.get(id) || null);
  });

const createBookingsByCourtLoader = () =>
  new DataLoader(async (courtIds) => {
    const bookings = await prisma.bookings.findMany({
      where: { courtId: { in: [...courtIds] }, active: true },
      select: {
        id: true,
        courtId: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });
    const grouped = new Map();
    courtIds.forEach((id) => grouped.set(id, []));
    bookings.forEach((booking) => {
      const list = grouped.get(booking.courtId);
      if (list) list.push(booking);
    });
    return courtIds.map((id) => grouped.get(id) || []);
  });

export const createLoaders = () => ({
  role: createRoleLoader(),
  user: createUserLoader(),
  accessByRole: createAccessByRoleLoader(),
  menu: createMenuLoader(),
  court: createCourtLoader(),
  bookingsByCourt: createBookingsByCourtLoader(),
});
