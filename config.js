'use strict';

export const DEST = 'build';
export const PORT = 4000;
export const UI_PORT = 4001;

export const production = (process.env.NODE_ENV === 'production');

export const siteData = {
  title: 'Jesse B. Hannah',
  subtitle: 'jbhannah',
  production: production,
  baseUrl: production ? 'https://jbhannah.net' : 'http://localhost:' + PORT,
  buildTime: new Date(),
  dateFormat: 'D MMMM YYYY'
};
