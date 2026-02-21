import prisma from '@database/client';
import { isEmpty } from 'lodash';

class ObjectData {
  /** Define métodos de utilidad para realizar trasacciones a BD mediante prisma
   * @param name Nombre de la entidad
   * @param tableName Nombre de la tabla en base de datos
   * @param schemas Objeto que contiene los `select` de prisma compatibles con la entidad
   * @param defaultSelect Objeto con los campos que deben ser consultados por defecto
   */
  constructor(name, tableName, schemas, defaultSelect) {
    this.name = name;
    this.tableName = tableName;
    this.schemas = schemas;
    this.defaultSelect = defaultSelect || schemas.DEFAULT;
    this.hasDefaultWhere = false;
    this.clean();
    this.setDefaultFilter(); //Para mostrar solo los son active
    this.setDefaultSelect();
    this.setTable();
  }

  /** Define si la entidad es auditable en base a la disponibilidad del módulo `audit` */
  #isAuditable = async () => {
    const modules = await this.prisma.base_module.findUnique({
      where: { code: 'audit' },
    });
    return modules?.active && this.auditable;
  };

  /** Establece la tabla de `prisma`, se reemplaza el cliente de `prisma` si este es especificado  */
  setTable = (client) => {
    if (client) {
      this.prisma = client;
      this.table = client[this.tableName];
    } else {
      this.prisma = prisma;
      this.table = prisma[this.tableName];
    }
  };

  /** Establece el usuario a ser auditado
   * @param user Objeto con datos del usuario
   */
  setAudited = (user) => {
    this.audited = user;
    this.auditable = true;
  };

  /** Establece si la entidad debe ser auditaba en base al parámetro recibido
   * @param auditable Booleano indicando si se debe auditar
   */
  setAuditable = (auditable) => {
    this.auditable = auditable;
  };

  /** Establece el `where` de prisma por defecto
   * @param where Objeto válido como `where` de `prisma`
   */
  setDefaultFilter = (where) => {
    // TODO: All tables should have an active field with true as default
    if (!this.defaultSelect?.hasOwnProperty('active')) return;
    if (!where) return;
    this.defaultFilter = where;
  };

  /** Establece el `select` de prisma por defecto
   * @param select Objeto válido como `select` de prisma
   */
  setDefaultSelect = (select) => {
    if (!select) return;
    const name = select.toUpperCase();
    const schema = this.schemas[name];
    if (schema) {
      this._select = schema;
      this.defaultSelect = schema;
    }
  };

  /** Establece el `where` de prisma en base al valor recibido, ignora el proceso si
   * no se envía un valor válido
   * @param where Objeto válido como `where` de `prisma`
   * */
  setRequestWhere = (where) => {
    if (!where) return;
    this.where(where);
  };

  /** Establece el `orderBy` de prisma en base al valor recibido, ignora el proceso si
   * no se envía un valor válido
   * @param ordeBy Objeto válido como `orderBy` de `prisma`
   * */
  setOrderBy = (orderBy) => {
    if (!orderBy) return;
    this.orderBy(orderBy);
  };

  /** Establece el valor `take` de prisma por defecto
   * @param take Número de registros a obtener
   */
  setDefaultTake = (take) => {
    if (!take) return;
    this._take = take;
  };

  /** Establece el `skip` de prisma por defecto
   * @param skip Número de registros a ignorar
   */
  setDefaultSkip = (skip) => {
    if (!skip) return;
    this._skip = skip;
  };

  /** Establece el `cursor` de prisma por defecto
   * @param cursor Identificador del registro desde el cual se debe consultar
   */
  setDefaultCursor = (cursor) => {
    if (!cursor) return;
    this._cursor = cursor;
  };

  /** Establece si se requiere realizar un conteo de los registros obtenidos
   * @param count Booleano indicando si se requiere contar
   */
  setCount = (count) => {
    if (!count) return;
    this._count = count;
  };

  // Handler

  /** Retorna el identificador del registro a auditar en un formato válido
   * @param id Identificador del registro como número entero
   */
  getRecordId = ({ id }) => id;

  /** Crea un registro de auditoría en la base de datos
   * @param action Acción realizada (`create` | `write` | `upsert`)
   * @param recordId Identificador del registro
   * @param data Datos de la creación o modificación
   * @param audited Usuario auditado (Opcional)
   */
  create_log = async (action, recordId, data, audited) => {
    if (isEmpty(data)) return;
    // TODO: What is there is not user?
    if (!(await this.#isAuditable())) return;
    await this.prisma.audit_log.create({
      data: {
        userId: this.audited?.id || audited,
        datetime: new Date(),
        table: this.tableName,
        record: this.getRecordId(recordId),
        action,
        data,
      },
    });
  };

  // Methods

  /** Limpiar todos los parámetros del objeto
   * @param control Opciones para configurar la limpieza.
   * - `noDefaultWhere`: Si es `true` ignora los `where` establecidos por default.
   * - `exclude`: El parámetro establecido como `true` se excluye de la limpieza
   * (`id`, `select`, `where`, `orderBy`, `take`, `skip`, `cursor`)
   */
  clean = (
    control = {
      noDefaultWhere: false,
      exclude: {
        id: false,
        select: false,
        where: false,
        orderBy: false,
        take: false,
        skip: false,
        cursor: false,
      },
    },
  ) => {
    if (!control?.exclude?.id) this.id = null;
    if (!control?.exclude?.select) this._select = this.defaultSelect;
    if (!control?.exclude?.where) this._where = {};
    if (!control?.exclude?.orderBy) this._orderBy = [];
    if (!control?.exclude?.take) this._take = null;
    if (!control?.exclude?.skip) this._skip = null;
    if (!control?.exclude?.cursor) this._cursor = null;
    this.hasDefaultWhere = !control.noDefaultWhere;
    return this;
  };

  /** Establece el identificador del registro a transaccionar
   * @param id Identificar entero numérico
   */
  record = (id) => {
    this._where = { id };
    return this;
  };

  /** Establece el `where` de `prisma` a utilizar en la transacción
   * @param params Objeto válido como `where` de `prisma`
   */
  where = (params) => {
    if (this.hasDefaultWhere) this._where = { ...this._where, ...params };
    else this._where = params;
    return this;
  };

  /** Establece el `select` de `prisma` a utilizar en la transacción
   * @param params Objeto válido como `select` de `prisma`
   */
  select = (params) => {
    this._select = params;
    return this;
  };

  /** Establece el `orderBy` de `prisma` a utilizar en la transacción
   * @param params Objeto válido como `orderBy` de `prisma`
   */
  orderBy = (params) => {
    this._orderBy = params;
    return this;
  };

  /** Establece el `take` de `prisma` a utilizar en la transacción
   * @param value Número de registros a obtener
   */
  take = (value) => {
    this._take = value;
    return this;
  };

  /** Establece el `skip` de `prisma` a utilizar en la transacción
   * @param value Número de registros a ignorar
   */
  skip = (value) => {
    this._skip = value;
    return this;
  };

  /** Establece el `cursor` de `prisma` a utilizar en la transacción
   * @param id Identificador del registro desde el cual consultar
   */
  cursor = (id) => {
    this._cursor = id;
    return this;
  };

  /** Retorna el `where` por defecto mezclado con el `where` especificado si
   * el `where` expecificado no contiene la llave `active` y si no existe un
   * `where` por default
   * @param where Objeto válido como `where` en `prisma`
   */
  #parseDefaultWhere = (where) => {
    /** If where has an active query, default filter is ignored */
    if (where?.active || !this.hasDefaultWhere) return this._where;
    return { ...this._where, ...this.defaultFilter };
  };

  // QUERIES

  /** Ejecuta el `sql` especificado mediante `prisma`
   * @param sql Sentencia SQL a ejecutar
   */
  query = async (sql) => {
    return await this.$queryRaw`${sql}`;
  };

  /** Retorna el número de registros que coincidan con `where`*/
  count = async () => {
    return await this.table.count({
      where: this._where,
    });
  };

  /** Retorna una lista de registros, retorna un objeto con llaves
   * `count` y `data` si el parámetro `count` fue especificado previamente
   */
  getAll = async () => {
    const query = { select: this._select, orderBy: this._orderBy };
    const where = this.#parseDefaultWhere();
    if (where) query.where = where;
    if (this._take) query.take = this._take;
    if (this._skip) query.skip = this._skip;
    if (this._cursor) {
      query.skip = 1;
      query.cursor = { id: this._cursor };
    }
    const count = this._count
      ? await this.table.count({ where: query.where })
      : null;
    const response = await this.table.findMany(query);
    this.clean();
    return this._count ? { count, data: response } : response;
  };

  /** Retorna el primer registro */
  getFirst = async () => {
    const response = await this.table.findFirst({
      where: this._where,
      select: this._select,
    });
    this.clean();
    return response;
  };

  /** Retorna el único registro que coincida con `where`, falla si
   * `where` resulta en más de un registro */
  getUnique = async () => {
    const response = await this.table.findUnique({
      where: this._where,
      select: this._select,
    });
    this.clean();
    return response;
  };

  /** Crea un registro
   * @param data Datos del registro a crear
   */
  create = async (data) => {
    const response = await this.table.create({ select: this._select, data });
    await this.create_log('create', response, data);
    return response;
  };

  /** Modifica un registro con los datos especificados, se debe especificar un `where` previamente
   * @param data Datos del objeto a modificar
   */
  update = async (data) => {
    const response = await this.table.update({
      select: this._select,
      data,
      where: this._where,
    });
    await this.create_log('write', response, data);
    return response;
  };

  /** Realiza un `upsert` (Crear o modificar) de un registro, se debe especificar un
   * `where` previamente. Falla si `where` resulta en más de un registro  */
  upsert = async (create, update) => {
    const response = await this.table.upsert({
      where: this._where,
      update: update || create,
      create,
    });
    await this.create_log('upsert', response, { create, write: update });
    return response;
  };
}

export default ObjectData;
