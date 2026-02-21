const DEFAULT = {
  id: true,
  name: true,
  location: true,
  latitude: true,
  longitude: true,
  userId: true,
  User: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
  isIndoor: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

const schemas = { DEFAULT };

export default schemas;
