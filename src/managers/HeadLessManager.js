// @flow

import type { EventPublisher } from 'spark-protocol';
import { SPARK_SERVER_EVENTS } from 'spark-protocol';
import rabbit from '../lib/rabbit';
import Logger from '../lib/logger';
const logger = Logger.createModuleLogger(module);


const devices = {};


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
      logger.info({ event }, 'New Event');
      rabbit.send(`EV_${event.name}`,event);
      if (event.name === 'spark/status') {
        if (event.data === 'online') {
          devices[event.deviceID] = true;
          (async (): Promise<any> => {
            const attr = await this.run('GET_DEVICE_ATTRIBUTES', { deviceID: event.deviceID });
            logger.info({ attr }, 'Attributes found');
            rabbit.send(`DEVICE_STATE`,{ online: attr });
          })();
        }
        if (event.data === 'offline') {
          devices[event.deviceID] = false;
          rabbit.send(`DEVICE_STATE`,{ offline: { deviceID: event.deviceID } });
        }
      } 
    });
    rabbit.registerReceiver({
        'DEVICE_ACTION':  (eventString: any, ack: () => void): void => {
          const event = JSON.parse(eventString);
          this.run(event.action, event.context)
            .then((answer: any) => {
                logger.info({ ans: answer, ev: event },'Answer found for action');
                ack();
                if (event.answerTo !== undefined) {
                    rabbit.send(event.answerTo, { answer, answerID: event.answerID });
                }
            })
            .catch((err: Error) => {
                logger.info({ err, ev: event }, 'Error found for action');
                ack();
            });
          return false;
        },
    });
  }

  run = async (method: string, context: any): Promise<any> => {
        if (SPARK_SERVER_EVENTS[method] === undefined) return Promise.reject(`Not a SparkServer Method ${method}`);
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
