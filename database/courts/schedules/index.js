import ObjectData from '@lib/database';
import schemas from '@database/courts/schedules/schemas';

class CourtScheduleData extends ObjectData {
  constructor() {
    const name = 'courtSchedules';
    const table = 'courtShedules';
    super(name, table, schemas);
  }
}

export default CourtScheduleData;
