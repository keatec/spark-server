// @flow

import { rabbit } from './lib/rabbit';
import Logger from './lib/logger';
const logger = Logger.createModuleLogger(module);

rabbit.registerReceiver({
  DEVICE_STATE: (ev: Event) => {
    logger.info({ ev }, 'State');
  },
  EV_BEAT: (ev: Event) => {
    logger.info({ dev: ev.deviceID, ev }, 'Beat');
    rabbit.send('DEVICE_ACTION', {
      action: 'GET_DEVICE_ATTRIBUTES',
      context: { deviceID: ev.deviceID },
    });
  },
});
