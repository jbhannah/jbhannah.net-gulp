'use strict';

import moment from 'moment';

import { siteData } from '../../config';

function localizeDates() {
  let times = document.getElementsByTagName('time');

  for (let i = 0; i < times.length; i++) {
    times[i].textContent = moment(times[i].attributes.datetime.value)
      .format(times[i].dataset.dateFormat || siteData.dateFormat);
  }
}

localizeDates();
