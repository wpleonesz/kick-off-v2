import MenuData from '@database/base/menu';
import ModuleData from '@database/base/module';
import RoleData from '@database/base/role';
import { upsert } from '@module/tools/upsert';

const entities = async () => {
  const moduleData = new ModuleData();
  const courtsModule = await moduleData.where({ code: 'courts' }).getUnique();
  const data = [
    {
      code: 'court',
      name: 'Canchas',
      moduleId: courtsModule.id,
    },
    {
      code: 'courtSchedule',
      name: 'Horarios de Canchas',
      moduleId: courtsModule.id,
    },
  ];
  return await upsert.entities(data);
};

const pages = async (moduleId) => {
  const data = [
    {
      code: 'court',
      name: 'Canchas',
      url: '/courts/court',
      moduleId: moduleId,
    },
    {
      code: 'courtSchedule',
      name: 'Horarios de Canchas',
      url: '/courts/schedule',
      moduleId: moduleId,
    },
  ];
  return await upsert.pages(data);
};

const menus = async (moduleId, pages) => {
  let data = [
    {
      code: 'courtshead',
      name: 'Canchas Deportivas',
      icon: null,
      header: true,
      priority: 5,
      moduleId: moduleId,
    },
  ];
  const header = await upsert.menus(data);
  data = [
    {
      code: 'court',
      name: 'Canchas',
      icon: 'sports_soccer',
      priority: 15,
      pageId: pages.court.id,
      moduleId: moduleId,
      menuId: header.courtshead.id,
    },
    {
      code: 'courtsconfig',
      name: 'Configuración Canchas Deportivas',
      displayName: 'Configuración',
      icon: 'settings',
      priority: 900,
      pageId: pages.courtsconfig.id,
      dashboard: true,
      moduleId: moduleId,
      menuId: header.courtshead.id,
    },
  ];
  const configuration = await upsert.menus(data);
  data = [
    {
      code: 'courtSchedule',
      name: 'Horarios de Canchas',
      description:
        'Parametrización de los horarios disponibles para las canchas deportivas',
      icon: 'apartment',
      header: false,
      priority: 5,
      pageId: pages.courtSchedule.id,
      moduleId: moduleId,
      menuId: configuration.courtsconfig.id,
    },
  ];
  const _menus = await upsert.menus(data);
  return { ...header, ...configuration, ..._menus };
};
