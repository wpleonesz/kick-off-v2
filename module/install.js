/* eslint-disable @next/next/no-assign-module-variable */
import audit from '@module/installers/audit.install';
import courts from '@module/installers/courts.install';

const install = async (module) => {
  if (module.code === 'audit') await audit(module.id);
  if (module.code === 'courts') await courts(module.id);
};

const module = { install };

export default module;
