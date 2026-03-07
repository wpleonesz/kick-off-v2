import nextConnect from 'next-connect';
import auth from '@middleware/auth';
import api from '@middleware/api';
import database from '@middleware/database';
import MenuData from '@database/base/menu';
import schemas from '@database/base/menu/schemas';
import menuHelper from '@helper/menu';
import { treeFilter } from '@helper/api/menu';
import { getCache, setCache, TTL } from '@lib/cache/cacheManager';

const handler = nextConnect();

handler
  .use(auth)
  .use(api)
  .use(database(MenuData))
  .get((request) => {
    request.do(null, async (api, prisma) => {
      const where = treeFilter(request);
      const cacheKey = `menu:tree:${request.user?.id || 'anon'}`;

      const cached = await getCache(cacheKey);
      if (cached) return api.successOne(cached);

      const menus = await prisma.menu
        .where(where)
        .select(schemas.TREE)
        .orderBy([{ priority: 'asc' }])
        .getAll();
      const tree = menuHelper.parseTree(menus);
      await setCache(cacheKey, tree, TTL.MENU_TREE);
      return api.successOne(tree);
    });
  });

export default handler;
