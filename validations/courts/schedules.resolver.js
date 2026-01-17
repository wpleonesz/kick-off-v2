import * as Yup from 'yup';
import { setLocale } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import Locale from '@validations/common';

setLocale(Locale);

const schema = Yup.object().shape({
  courtId: Yup.number().required('Cancha requerida'),
  dayOfWeek: Yup.number().required('Día de la semana requerido'),
  duration: Yup.number().required('Duración requerida'),
  startTime: Yup.string().required('Hora de inicio requerida'),
  endTime: Yup.string().required('Hora de fin requerida'),
});

export const resolver = yupResolver(schema);
