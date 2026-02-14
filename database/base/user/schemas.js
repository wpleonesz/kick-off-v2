const DEFAULT = {
  id: true,
  username: true,
  active: true,
  email: true,
  createdDate: true,
  lastPasswordDate: true,
  modifiedDate: true,
  personId: true,
  password: false,
  recoverToken: false,
  recoverDate: false,
  accountTypeId: true,
  AccountType: true,
  Person: {
    select: {
      id: true,
      photo: true,
      dni: true,
      name: true,
      lastName: true,
      firstName: true,
      email: true,
      mobile: true,
    },
  },
  roles: {
    select: {
      roleId: true,
      Role: true,
      active: true,
    },
  },
};

const PUBLIC = {
  id: true,
  username: true,
  active: true,
  Person: {
    select: {
      name: true,
    },
  },
};

const PUBLICRECOVERTOKEN = {
  ...PUBLIC,
  recoverDate: true,
};

const CREDENTIALS = {
  ...PUBLIC,
  email: true,
  Person: {
    select: {
      id: true,
      name: true,
      dni: true,
    },
  },
  AccountType: {
    select: {
      id: true,
      value: true,
    },
  },
  roles: {
    select: {
      roleId: true,
      Role: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
};

const RECOVER_EMAIL = {
  ...PUBLIC,
  email: true,
  Person: {
    select: {
      name: true,
      email: true,
    },
  },
};
const SEND_EMAIL = {
  email: true,
  Person: {
    select: {
      name: true,
      email: true,
    },
  },
};
const ROLES = {
  roles: {
    select: {
      Role: {
        select: {
          name: true,
          access: {
            select: {
              read: true,
              create: true,
              write: true,
              remove: true,
              Entity: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
    },
  },
};

const schemas = {
  DEFAULT,
  PUBLICRECOVERTOKEN,
  CREDENTIALS,
  RECOVER_EMAIL,
  ROLES,
  PUBLIC,
  SEND_EMAIL,
};

export default schemas;
