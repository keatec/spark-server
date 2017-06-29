'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _logger = require('../lib/logger');

var _logger2 = _interopRequireDefault(_logger);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var rabbitConnection = void 0;
var mainchannel = void 0;
var queues = {};
var receivers = {};
var newReceivers = void 0;
var rabbitIncoming = 'INCOMING_' + (process.env.HOSTNAME !== undefined ? process.env.HOSTNAME : process.env.COMPUTERNAME);

var logger = _logger2.default.createModuleLogger(module);

var rabbitHost = process.env.RABBIT_PORT_5672_TCP_ADDR || '172.22.17.61';
var rabbitPort = process.env.RABBIT_PORT_5672_TCP_PORT || 9998;

logger.info({
  rabbitHost: rabbitHost,
  rabbitPort: rabbitPort
}, 'Creating Rabbit connection');

var pubQ = []; // Publish Queue, to be processed
var amqp = require('amqplib');

var awaitingAnswer = {};

function processElement(qname, data) {
  if (queues[qname] === undefined) {
    mainchannel.assertQueue(qname, {
      arguments: {
        'x-message-ttl': 3 * 60 * 1000
      },
      durable: false
    }).then(function () {
      queues[qname] = 1;
      logger.info({
        qname: qname
      }, 'Asserted and Send');
      mainchannel.sendToQueue(qname, new Buffer((0, _stringify2.default)(data)));
    });
  } else {
    logger.info({
      qname: qname
    }, 'Send');
    mainchannel.sendToQueue(qname, new Buffer((0, _stringify2.default)(data)));
  }
}

function registerReceiver(name, callback) {
  logger.info({ name: name }, 'Register Recevier ' + name);
  mainchannel.assertQueue(name, {
    arguments: {
      'x-message-ttl': 3 * 60 * 1000
    },
    durable: false
  }).then(function (info) {
    logger.info({
      info: info,
      name: name
    }, 'Registered ');
    mainchannel.consume(info.queue, function (msg) {
      try {
        logger.info({
          q: info.queue
        }, 'Got Message');
        if (callback(msg.content.toString(), function () {
          mainchannel.ack(msg);
        }) !== false) {
          mainchannel.ack(msg);
        }
      } catch (e) {
        logger.error({
          err: e.message,
          msg: msg,
          name: name
        }, 'Error on Executing message receiver');
      }
    }, {
      noAck: false
    });
  });
}

/**
 * 
 *  MainQueue
 * 
 */
setInterval(function () {
  if (mainchannel === undefined) return;
  if (pubQ.length > 0) {
    var b = void 0;
    var cc = 0;
    while (true) {
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
    (0, _keys2.default)(receivers).forEach(function (key) {
      registerReceiver(key, receivers[key]);
    });
    registerReceiver(rabbitIncoming, function (data) {
      logger.debug({ data: data }, 'Got Incoming');
      var answer = JSON.parse(data);
      var answerID = answer.answerID;
      if (awaitingAnswer[answerID] !== undefined) {
        var res = awaitingAnswer[answerID];
        delete awaitingAnswer[answerID];
        res.resolve(answer.answer);
      } else {
        logger.warn({ answerID: answerID }, 'Received Answer, but answer cant be found');
      }
    });
    newReceivers = undefined;
  }
}, 200).unref();

var afterConnect = function afterConnect() {
  logger.info('Was Connected');
  // Start Publisher
  rabbitConnection.createChannel().then(function (ch) {
    mainchannel = ch;
    mainchannel.on('error', function (err) {
      logger.error({
        err: err
      }, 'RMQChannel Error');
    });
    mainchannel.on('close', function (err) {
      logger.info({
        err: err
      }, 'RMQChannel Channel was closed');
      mainchannel = undefined;
    });
  }).catch(function (err) {
    mainchannel = undefined;
    logger.error({
      err: err
    }, 'Channel Create Error');
  });
};

var mqRunning = true;

var start = function start() {
  amqp.connect('amqp://' + rabbitHost + ':' + rabbitPort + '/?heartbeat=60', {
    clientProperties: {
      platform: require.main.filename.split(/[/\\]/).splice(-1, 1),
      product: 'RabbitConnector'
    }
  }).then(function (conn) {
    logger.info('Rabbit Connected');
    rabbitConnection = conn;
    rabbitConnection.on('error', function (err) {
      logger.error({
        err: err
      }, 'RMQ Error');
    });
    rabbitConnection.on('close', function (err) {
      mainchannel = undefined;
      rabbitConnection = undefined;
      queues = {};
      if (receivers !== undefined) {
        newReceivers = receivers;
        receivers = undefined;
      }
      if (mqRunning) {
        logger.error({
          err: err
        }, 'RMQ Closed');
        if (mqRunning) setTimeout(start, 1000);
      }
    });
    afterConnect();
  }).catch(function (err) {
    logger.error({
      err: err
    }, 'Rabbit Not Connected');
    setTimeout(start, 1000);
  });

  process.on('beforeExit', function () {
    mqRunning = false;
    mainchannel = undefined;
    if (rabbitConnection !== undefined) rabbitConnection.close();
  });
};
start();

logger.info('Started');

function maintenance() {
  var n = Date.now();
  (0, _keys2.default)(awaitingAnswer).forEach(function (key) {
    logger.debug({ key: key }, 'check');
    if (awaitingAnswer[key].timeout < n) {
      awaitingAnswer[key].reject('Timeout');
      delete awaitingAnswer[key];
      logger.warn({ key: key }, 'action timeout');
    }
  });
};
setInterval(maintenance, 5000).unref();

var userabbit = {
  registerReceiver: function registerReceiver(obj) {
    newReceivers = obj;
  },
  send: function send(name, data) {
    pubQ.push([name, data]);
  },
  sendAction: function sendAction(action, data) {
    return new _promise2.default(function (resolve, reject) {
      var answerID = _uuid2.default.v4();
      awaitingAnswer[answerID] = {
        reject: reject,
        resolve: resolve,
        timeout: Date.now() + 5000
      };
      userabbit.send('DEVICE_ACTION', {
        action: action,
        answerID: answerID,
        answerTo: rabbitIncoming,
        context: data
      });
    });
  }
};

exports.default = userabbit;