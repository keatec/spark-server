// @flow

import Logger from '../lib/logger';

let rabbitConnection;
let mainchannel: any;
let queues = {};
let receivers = {};
let newReceivers: ICallbackArray;

const rabbitIncoming = `INCOMING_${process.env.HOSTNAME !== undefined
  ? (process.env.HOSTNAME: any)
  : (process.env.COMPUTERNAME: any)}`;

console.log(process.env);

const logger = Logger.createModuleLogger(module);

const rabbitHost =
  (process.env.RABBIT_PORT_5672_TCP_ADDR: any) || '172.22.17.61';
const rabbitPort = (process.env.RABBIT_PORT_5672_TCP_PORT: any) || 9998;

export type IQueueEvent = {
  [name: string]: any,
};
export type IQueueCallback = (message: string, ack: () => void) => void;
export type ICallbackArray = {
  [name: string]: (ev: any) => void,
};

logger.info(
  {
    rabbitHost,
    rabbitPort,
  },
  'Creating Rabbit connection',
);

const pubQ = []; // Publish Queue, to be processed
const amqp = require('amqplib');

function processElement(qname: string, data: any) {
  if (queues[qname] === undefined) {
    mainchannel
      .assertQueue(qname, {
        arguments: {
          'x-message-ttl': 3 * 60 * 1000,
        },
        durable: false,
      })
      .then(() => {
        queues[qname] = 1;
        logger.info(
          {
            qname,
          },
          'Asserted and Send',
        );
        mainchannel.sendToQueue(qname, new Buffer(JSON.stringify(data)));
      });
  } else {
    logger.info(
      {
        qname,
      },
      'Send',
    );
    mainchannel.sendToQueue(qname, new Buffer(JSON.stringify(data)));
  }
}

function registerReceiver(
  name: string,
  callback: (eventData: string, callback: () => void) => boolean,
) {
  logger.info({ name }, `Register Recevier ${name}`);
  mainchannel
    .assertQueue(name, {
      arguments: {
        'x-message-ttl': 3 * 60 * 1000,
      },
      durable: false,
    })
    .then((info: any) => {
      logger.info(
        {
          info,
          name,
        },
        'Registered ',
      );
      mainchannel.consume(
        info.queue,
        (msg: any) => {
          try {
            logger.info(
              {
                q: info.queue,
              },
              'Got Message',
            );
            if (
              callback(msg.content.toString(), () => {
                mainchannel.ack(msg);
              }) !== false
            ) {
              mainchannel.ack(msg);
            }
          } catch (e) {
            logger.error(
              {
                err: e.message,
                msg,
                name,
              },
              'Error on Executing message receiver',
            );
          }
        },
        {
          noAck: false,
        },
      );
    });
}

/**
 * 
 *  MainQueue
 * 
 */
setInterval(() => {
  if (mainchannel === undefined) return;
  if (pubQ.length > 0) {
    let b;
    let cc = 0;
    while (cc > 0) {
      // eslint-disable-line no-constant-condition
      cc += 1;
      if (cc > 10) break;
      b = pubQ.shift();
      if (!b) break;
      processElement(b[0], b[1]);
    }
  }
  if (newReceivers !== undefined) {
    logger.info('Registering Receivers');
    receivers = newReceivers;
    Object.keys(receivers).forEach((key: string) => {
      registerReceiver(key, receivers[key]);
    });
    registerReceiver(rabbitIncoming, (answer: any) => {
      logger.info({ ans: answer }, 'Got Incoming');
    });
    newReceivers = undefined;
  }
}, 200).unref();

const afterConnect = () => {
  logger.info('Was Connected');
  // Start Publisher
  rabbitConnection
    .createChannel()
    .then((ch: any) => {
      logger.info({ ch }, 'Channel Created ...');
      mainchannel = ch;
      mainchannel.on('error', (err: Error) => {
        logger.error(
          {
            err,
          },
          'RMQChannel Error',
        );
      });
      mainchannel.on('close', (err: Error) => {
        logger.info(
          {
            err,
          },
          'RMQChannel Channel was closed',
        );
        mainchannel = undefined;
      });
    })
    .catch((err: Error) => {
      mainchannel = undefined;
      logger.error(
        {
          err,
        },
        'Channel Create Error',
      );
    });
};

let mqRunning = true;

const start = () => {
  amqp
    .connect(`amqp://${rabbitHost}:${rabbitPort}/?heartbeat=60`, {
      clientProperties: {
        platform: require.main.filename.split(/[/\\]/).splice(-1, 1),
        product: 'RabbitConnector',
      },
    })
    .then((conn: any) => {
      logger.info('Rabbit Connected');
      rabbitConnection = conn;
      rabbitConnection.on('error', (err: Error) => {
        logger.error(
          {
            err,
          },
          'RMQ Error',
        );
      });
      rabbitConnection.on('close', (err: Error) => {
        mainchannel = undefined;
        rabbitConnection = undefined;
        queues = {};
        if (receivers !== undefined) {
          newReceivers = receivers;
          receivers = undefined;
        }
        if (mqRunning) {
          logger.error(
            {
              err,
            },
            'RMQ Closed',
          );
          if (mqRunning) setTimeout(start, 1000);
        }
      });
      afterConnect();
    })
    .catch((err: Error) => {
      logger.error(
        {
          err,
        },
        'Rabbit Not Connected',
      );
      setTimeout(start, 1000);
    });

  process.on('beforeExit', () => {
    mqRunning = false;
    mainchannel = undefined;
    if (rabbitConnection !== undefined) rabbitConnection.close();
  });
};
start();

logger.info('Started');

export class rabbit {
  static registerReceiver(obj: ICallbackArray) {
    newReceivers = obj;
  }
  static send(name: string, data: any) {
    pubQ.push([name, data]);
  }
}
