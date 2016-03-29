'use strict';

import moment from 'moment';

let times = document.getElementsByTagName('time');

for (let i = 0; i < times.length; i++) {
  times[i].textContent = moment(times[i].attributes.datetime.value).format('D MMMM YYYY');
}
