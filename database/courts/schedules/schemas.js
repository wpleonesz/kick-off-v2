const DEFAULT = {
  id: true,
  courtId: true,
  Court: {
    select: {
      id: true,
      name: true,
      location: true,
    },
  },
  dayOfWeek: true,
  duration: true,
  startTime: true,
  endTime: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

const schemas = { DEFAULT };

export default schemas;
