'use strict';

export const DEST = 'build';
export const PORT = 4000;
export const LR_PORT = 35729;

export const production = (process.env.NODE_ENV === 'production');

export const siteData = {
  title: 'Jesse B. Hannah',
  subtitle: 'jbhannah',
  production: production,
  baseUrl: production ? 'https://jbhannah.net' : 'http://localhost:' + PORT,
  timezone: 'America/Phoenix',
  buildTime: new Date(),
  dateFormat: 'D MMMM YYYY'
};
