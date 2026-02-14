const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { capitalize } = require('lodash');
const prisma = new PrismaClient();

// TOOLS

const parsePassword = (password) => {
  return crypto
    .createHash(process.env.HASH_ALGORITHM)
    .update(`${process.env.PASSWORD_SECRET}${password}`, 'utf-8')
    .digest('hex');
};

// LOCAL USER VAR ------------------------------------------------------------

const seedLocalUserVar = async ({ name, displayName, read, write, code }) => {
  return await prisma.base_localUserVar.upsert({
    where: { code },
    update: {},
    create: { name, displayName, read, write, code },
  });
};

const seedLocalUserVars = async () => {
  await seedLocalUserVar({
    name: 'displayName',
    read: true,
    write: true,
    displayName: 'Nombre para mostrar',
    code: 'DisName',
  });
  await seedLocalUserVar({
    name: 'name',
    read: true,
    write: true,
    displayName: 'Nombre Completo',
    code: 'name',
  });
  await seedLocalUserVar({
    name: 'firstName',
    read: true,
    write: true,
    displayName: 'Nombres',
    code: 'firstN',
  });
  await seedLocalUserVar({
    name: 'lastName',
    read: true,
    write: true,
    displayName: 'Apellidos',
    code: 'lastN',
  });
  await seedLocalUserVar({
    name: 'dni',
    read: true,
    write: true,
    displayName: 'Cedula/Pasaporte ',
    code: 'dni',
  });
  await seedLocalUserVar({
    name: 'email',
    read: true,
    write: true,
    displayName: 'Correo institucional',
    code: 'email',
  });
  await seedLocalUserVar({
    name: 'mobile',
    read: true,
    write: true,
    displayName: 'Celular',
    code: 'mobile',
  });
  await seedLocalUserVar({
    name: 'accountName',
    read: true,
    write: true,
    displayName: 'Nombre de cuenta',
    code: 'accName',
  });
  await seedLocalUserVar({
    name: 'createdDate',
    read: true,
    write: false,
    displayName: 'Fecha de Creacion',
    code: 'cDate',
  });
  await seedLocalUserVar({
    name: 'lastPasswordDate',
    read: true,
    write: false,
    displayName: 'Fecha cambio de contraseña',
    code: 'lDate',
  });
  await seedLocalUserVar({
    name: 'personalEmail',
    read: true,
    write: false,
    displayName: 'Correo personal',
    code: 'pemail',
  });
};

// MODULES ------------------------------------------------------------

const seedModule = async ({
  code,
  name,
  subname,
  description,
  icon,
  installed,
  active,
}) => {
  return await prisma.base_module.upsert({
    where: { code },
    update: {},
    create: { name, subname, code, description, icon, installed, active },
  });
};

const seedModules = async () => {
  const base = await seedModule({
    code: 'base',
    name: 'Base',
    subname: 'Parametrización',
    description: 'Contiene las funcionalidades base del sistema',
    icon: '/assets/images/module/icons/base.png',
    installed: true,
    active: true,
  });
  const audit = await seedModule({
    code: 'audit',
    name: 'Auditoría',
    subname: 'Registro de cambios',
    description:
      'Funcionalidades que permiten del registro de logs al realizar operaciones de creación o actualización en la base de datos',
    icon: '/assets/images/module/icons/audit.png',
    installed: false,
    active: false,
  });
  const courts = await seedModule({
    code: 'courts',
    name: 'Canchas Deportivas',
    subname: 'Gestión de canchas deportivas',
    description:
      'Funcionalidades que permiten la gestión de canchas deportivas y sus horarios',
    icon: '/assets/images/module/icons/courts.png',
    installed: false,
    active: false,
  });

  const modules = { base, audit, courts };
  return modules;
};

// ENTITIES ------------------------------------------------------------

const seedEntity = async ({ code, name, moduleId }) => {
  return await prisma.base_entity.upsert({
    where: { code },
    update: {},
    create: { code, name, moduleId },
  });
};

const seedEntities = async (modules) => {
  const user = await seedEntity({
    code: 'user',
    name: 'Usuario',
    moduleId: modules.base.id,
  });
  const person = await seedEntity({
    code: 'person',
    name: 'Persona',
    moduleId: modules.base.id,
  });
  const page = await seedEntity({
    code: 'page',
    name: 'Página',
    moduleId: modules.base.id,
  });
  const menu = await seedEntity({
    code: 'menu',
    name: 'Menú',
    moduleId: modules.base.id,
  });
  const role = await seedEntity({
    code: 'role',
    name: 'Rol',
    moduleId: modules.base.id,
  });
  const rolemenu = await seedEntity({
    code: 'rolemenu',
    name: 'Rol-Menu',
    moduleId: modules.base.id,
  });
  const localUserVar = await seedEntity({
    code: 'localuservar',
    name: 'Variable local de Usuario',
    moduleId: modules.base.id,
  });
  const _module = await seedEntity({
    code: 'module',
    name: 'Módulo',
    moduleId: modules.base.id,
  });
  const entity = await seedEntity({
    code: 'entity',
    name: 'Entidad',
    moduleId: modules.base.id,
  });
  const access = await seedEntity({
    code: 'access',
    name: 'Acceso',
    moduleId: modules.base.id,
  });
  const parameter = await seedEntity({
    code: 'parameter',
    name: 'Parámetros',
    moduleId: modules.base.id,
  });

  return {
    user,
    person,
    page,
    menu,
    role,
    rolemenu,
    localUserVar,
    _module,
    entity,
    access,
    parameter,
  };
};

// PAGES --------------------------------------------------------------

const seedPage = async ({ code, name, url, moduleId }) => {
  return await prisma.base_page.upsert({
    where: { code },
    update: {},
    create: { code, name, url, moduleId },
  });
};

const seedPages = async (modules) => {
  const home = await seedPage({
    code: 'home',
    name: 'Inicio',
    url: '/',
    moduleId: modules.base.id,
  });
  const config = await seedPage({
    code: 'config',
    name: 'Configuración Base',
    url: '/base/config',
    moduleId: modules.base.id,
  });
  const entities = await seedPage({
    code: 'entities',
    name: 'Entidades',
    url: '/base/config/entities',
    moduleId: modules.base.id,
  });
  const users = await seedPage({
    code: 'users',
    name: 'Usuarios',
    url: '/base/users',
    moduleId: modules.base.id,
  });
  const _modules = await seedPage({
    code: 'modules',
    name: 'Módulos',
    url: '/base/modules',
    moduleId: modules.base.id,
  });
  const roles = await seedPage({
    code: 'roles',
    name: 'Roles',
    url: '/base/config/roles',
    moduleId: modules.base.id,
  });
  const menus = await seedPage({
    code: 'menus',
    name: 'Menus',
    url: '/base/config/menus',
    moduleId: modules.base.id,
  });
  const _pages = await seedPage({
    code: 'pages',
    name: 'Páginas',
    url: '/base/config/pages',
    moduleId: modules.base.id,
  });
  const parameter = await seedPage({
    code: 'parameter',
    name: 'Parametros',
    url: '/base/config/parameter',
    moduleId: modules.base.id,
  });

  const pages = {
    home,
    config,
    entities,
    users,
    modules: _modules,
    roles,
    menus,
    pages: _pages,
    parameter,
  };
  return pages;
};

// MENUS --------------------------------------------------------------

const seedMenu = async ({
  code,
  name,
  displayName,
  description,
  icon,
  header,
  dashboard,
  priority,
  pageId,
  moduleId,
  menuId,
}) => {
  return await prisma.base_menu.upsert({
    where: { code },
    update: {},
    create: {
      code,
      name,
      displayName,
      description,
      icon,
      header,
      dashboard,
      priority,
      pageId,
      moduleId,
      menuId,
    },
  });
};

const seedMenus = async (modules, pages) => {
  const home = await seedMenu({
    code: 'home',
    name: 'Inicio',
    icon: 'home',
    header: false,
    priority: 0,
    pageId: pages.home.id,
    moduleId: modules.base.id,
    menuId: null,
  });
  const administration = await seedMenu({
    code: 'admhead',
    name: 'Administración',
    icon: null,
    header: true,
    priority: 50,
    pageId: null,
    moduleId: modules.base.id,
    menuId: null,
  });
  const users = await seedMenu({
    code: 'users',
    name: 'Usuarios',
    icon: 'peoplealt',
    header: false,
    priority: 5,
    pageId: pages.users.id,
    moduleId: modules.base.id,
    menuId: administration.id,
  });
  const _modules = await seedMenu({
    code: 'modules',
    name: 'Módulos',
    icon: 'apps',
    header: false,
    priority: 15,
    pageId: pages.modules.id,
    moduleId: modules.base.id,
    menuId: administration.id,
  });
  const config = await seedMenu({
    code: 'config',
    name: 'Configuración Base',
    displayName: 'Configuración',
    icon: 'settings',
    header: false,
    dashboard: true,
    priority: 900,
    pageId: pages.config.id,
    moduleId: modules.base.id,
    menuId: administration.id,
  });
  const entities = await seedMenu({
    code: 'entities',
    name: 'Entidades',
    description:
      'Parametrización de entidades utilizadas para los permisos de acceso',
    icon: 'widgets',
    header: false,
    priority: 1,
    pageId: pages.entities.id,
    moduleId: modules.base.id,
    menuId: config.id,
  });
  const roles = await seedMenu({
    code: 'roles',
    name: 'Roles',
    description: 'Parametrización de roles',
    icon: 'security',
    header: false,
    priority: 20,
    pageId: pages.roles.id,
    moduleId: modules.base.id,
    menuId: config.id,
  });
  const _menus = await seedMenu({
    code: 'menus',
    name: 'Menús',
    description: 'Parametrización de elementos de menú',
    icon: 'list',
    header: false,
    priority: 25,
    pageId: pages.menus.id,
    moduleId: modules.base.id,
    menuId: config.id,
  });
  const _pages = await seedMenu({
    code: 'pages',
    name: 'Páginas',
    description: 'Parametrización de páginas',
    icon: 'web',
    header: false,
    priority: 30,
    pageId: pages.pages.id,
    moduleId: modules.base.id,
    menuId: config.id,
  });
  const parameter = await seedMenu({
    code: 'parameter',
    name: 'Parámetros',
    description:
      'Administración y registro de parámetros generales del sistema',
    icon: 'ballot',
    header: false,
    priority: 60,
    pageId: pages.parameter.id,
    moduleId: modules.base.id,
    menuId: config.id,
  });

  const menus = {
    home,
    administration,
    entities,
    users,
    baseconfig: config,
    modules: _modules,
    roles,
    menus: _menus,
    pages: _pages,
    parameter,
  };
  return menus;
};

// ROLES --------------------------------------------------------------

const seedRole = async ({ code, name, description, moduleId }) => {
  return await prisma.base_role.upsert({
    where: { code },
    update: {},
    create: { code, name, description, moduleId },
  });
};

const seedRoles = async (modules) => {
  const user = await seedRole({
    code: 'user',
    name: 'Usuario',
    description: 'Usuario base',
    moduleId: modules.base.id,
  });
  const administrator = await seedRole({
    code: 'administrator',
    name: 'Administrador',
    description: 'Usuario administrador del sistema',
    moduleId: modules.base.id,
  });

  // Kick Off roles
  const player = await seedRole({
    code: 'player',
    name: 'Jugador',
    description: 'Usuario que reserva y juega en las canchas',
    moduleId: modules.base.id,
  });
  const referee = await seedRole({
    code: 'referee',
    name: 'Árbitro',
    description: 'Usuario que arbitra partidos',
    moduleId: modules.base.id,
  });
  const organizer = await seedRole({
    code: 'organizer',
    name: 'Organizador',
    description: 'Usuario que organiza torneos y eventos',
    moduleId: modules.base.id,
  });
  const owner = await seedRole({
    code: 'owner',
    name: 'Propietario de cancha',
    description: 'Propietario o administrador de canchas',
    moduleId: modules.base.id,
  });

  return {
    user,
    administrator,
    player,
    referee,
    organizer,
    owner,
  };
};

// ACCESS -------------------------------------------------------------

const _seedAccess = async ({
  code,
  entityId,
  roleId,
  read,
  create,
  write,
  remove,
}) => {
  return await prisma.base_access.upsert({
    where: { code },
    update: {},
    create: {
      code,
      entityId,
      roleId,
      read,
      create,
      write,
      remove,
    },
  });
};

const seedAccess = async (entities, roles) => {
  Object.entries(entities).map(async ([_, entity]) => {
    await _seedAccess({
      code: `adm${capitalize(entity.code)}`,
      entityId: entity.id,
      roleId: roles.administrator.id,
      read: true,
      create: true,
      write: true,
      remove: true,
    });
  });
};

// ROLES ON MENUS -----------------------------------------------------

const seedRoleOnMenu = async ({ roleId, menuId }) => {
  return await prisma.base_rolesOnMenus.upsert({
    where: { roleId_menuId: { roleId, menuId } },
    update: {},
    create: { roleId, menuId },
  });
};

const seedRolesOnMenus = async (roles, menus) => {
  // User Profile
  await seedRoleOnMenu({
    roleId: roles.user.id,
    menuId: menus.home.id,
  });
  // Administrator Profile
  Object.entries(menus).map(async ([key, menu]) => {
    console.log(key);
    await seedRoleOnMenu({
      roleId: roles.administrator.id,
      menuId: menu.id,
    });
  });
};

// PERSON & USER --------------------------------------------------------------

const seedPerson = async ({ dni, name, firstName, lastName, email }) => {
  return await prisma.base_person.upsert({
    where: { dni },
    update: {},
    create: { dni, name, firstName, lastName, email },
  });
};

const seedUser = async ({ username, password, email, personId }) => {
  return await prisma.base_user.upsert({
    where: { username },
    update: {},
    create: { username, password, email, personId },
  });
};

const seedAdminUser = async (roles) => {
  // Crear persona del admin
  const adminPerson = await seedPerson({
    dni: '0000000000',
    name: 'ADMINISTRADOR SISTEMA',
    firstName: 'ADMINISTRADOR',
    lastName: 'SISTEMA',
    email: 'admin@sistema.com',
  });

  // Crear usuario admin
  const adminUser = await seedUser({
    username: 'admin',
    password: parsePassword('admin123'),
    email: 'admin@sistema.com',
    personId: adminPerson.id,
  });

  // Asignar rol de administrador
  await prisma.base_rolesOnUsers.upsert({
    where: {
      roleId_userId: {
        roleId: roles.administrator.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      roleId: roles.administrator.id,
      userId: adminUser.id,
      active: true,
    },
  });

  console.log('✅ Usuario admin creado:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   Email: admin@sistema.com');
};

// MAIN  --------------------------------------------------------------

const main = async () => {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  await seedLocalUserVars();
  console.log('✅ Variables de usuario creadas');

  const modules = await seedModules();
  console.log('✅ Módulos creados');

  const roles = await seedRoles(modules);
  console.log('✅ Roles creados');

  const pages = await seedPages(modules);
  console.log('✅ Páginas creadas');

  const menus = await seedMenus(modules, pages);
  console.log('✅ Menús creados');

  await seedAdminUser(roles);

  const entities = await seedEntities(modules);
  console.log('✅ Entidades creadas');

  await seedRolesOnMenus(roles, menus);
  console.log('✅ Relaciones rol-menú creadas');

  await seedAccess(entities, roles);
  console.log('✅ Accesos creados');

  console.log('\n🎉 Seed completado exitosamente!');
};

main()
  .catch((error) => {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
