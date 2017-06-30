// @flow

import rabbit from './lib/rabbit';
import Logger from './lib/logger';
const logger = Logger.createModuleLogger(module);

rabbit.registerReceiver({
    'DEVICE_STATE': (data: string) => {
        logger.info({ data }, 'State');
    },
    'EV_BEAT': (data: string) => {
        const ev = JSON.parse(data);
        logger.info({ deviceID : ev.deviceID }, 'Beat');
        rabbit.sendAction('GET_DEVICE_ATTRIBUTES', { deviceID: ev.deviceID })
            .then ((answer: any): void => logger.info({ answer }, 'Got Answer'))
            .catch((err: Error): void => logger.error({ err }, 'Error'));
    }
});

