import * as Yup from 'yup';
import { setLocale } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import Locale from '@validations/common';

setLocale(Locale);

const schema = Yup.object().shape({
  dni: Yup.string().required('Identificación requerida').min(3).max(100),
  firstName: Yup.string().required('Nombres requeridos').min(3).max(100),
  lastName: Yup.string().required('Apellidos requerido').min(3).max(100),
  name: Yup.string().required('Nombre completo requerido').min(3).max(100),
  email: Yup.string()
    .required('Correo electrónico requerido')
    .email('Correo electrónico incorrecto'),
  username: Yup.string().required('Usuario requerido').min(3).max(20),
  mobile: Yup.string().required('Número celular requerido'),
  roles: Yup.array()
    .required('Al menos un rol requerido')
    .min(1, 'Al menos un rol requerido'),
});

export const resolver = yupResolver(schema);

const signupSchema = Yup.object().shape({
  dni: Yup.string().required('Identificación requerida').min(10).max(13),
  firstName: Yup.string().required('Nombres requeridos').min(3).max(100),
  lastName: Yup.string().required('Apellidos requeridos').min(3).max(100),
  email: Yup.string()
    .required('Correo electrónico requerido')
    .email('Correo electrónico incorrecto'),
  username: Yup.string().required('Usuario requerido').min(3).max(20),
  password: Yup.string()
    .required('Contraseña requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  mobile: Yup.string().required('Número celular requerido'),
});

export const signupResolver = yupResolver(signupSchema);
