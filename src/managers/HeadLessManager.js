// @flow

import type { EventPublisher } from 'spark-protocol';
import { SPARK_SERVER_EVENTS } from 'spark-protocol';
import Logger from '../lib/logger';
const logger = Logger.createModuleLogger(module);


class HeadLessManagers {
  _eventPublisher: EventPublisher;
  _eventProvider: any;

  constructor(
    eventPublisher: EventPublisher,
    eventProvider: any
  ) {
    this._eventPublisher = eventPublisher;
    this._eventProvider = eventProvider;
    this._eventProvider.onNewEvent((event: Event) => {
      logger.info('Event onNewEvent',event);
      (async (): Promise<any> => {
         const attr = await this.run('GET_DEVICE_ATTRIBUTES', { deviceID: event.deviceID });
         logger.info({ attr }, 'Attributes found');
      })();
    });
  }

  run = async (method: string, context: any): Promise<any> => {
        if (SPARK_SERVER_EVENTS[method] === undefined) return Promise.reject('Not a SparkServer Method');
        const answer = await this._eventPublisher.publishAndListenForResponse(
            {
                context: context === undefined ? {} :  context,
                name: SPARK_SERVER_EVENTS[method],
            }
        );
        return answer;
  }

}

export default HeadLessManagers;
