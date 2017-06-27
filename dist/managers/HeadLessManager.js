'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _sparkProtocol = require('spark-protocol');

var _rabbit = require('../lib/rabbit');

var _rabbit2 = _interopRequireDefault(_rabbit);

var _logger = require('../lib/logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = _logger2.default.createModuleLogger(module);

var devices = {};

var HeadLessManagers = function HeadLessManagers(eventPublisher, eventProvider) {
  var _this = this;

  (0, _classCallCheck3.default)(this, HeadLessManagers);

  this.run = function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(method, context) {
      var answer;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!(_sparkProtocol.SPARK_SERVER_EVENTS[method] === undefined)) {
                _context.next = 2;
                break;
              }

              return _context.abrupt('return', _promise2.default.reject('Not a SparkServer Method ' + method));

            case 2:
              _context.next = 4;
              return _this._eventPublisher.publishAndListenForResponse({
                context: context === undefined ? {} : context,
                name: _sparkProtocol.SPARK_SERVER_EVENTS[method]
              });

            case 4:
              answer = _context.sent;
              return _context.abrupt('return', answer);

            case 6:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }();

  this._eventPublisher = eventPublisher;
  this._eventProvider = eventProvider;
  this._eventProvider.onNewEvent(function (event) {
    logger.info({ event: event }, 'New Event');
    _rabbit2.default.send('EV_' + event.name, event);
    if (event.name === 'spark/status') {
      if (event.data === 'online') {
        devices[event.deviceID] = true;
        (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
          var attr;
          return _regenerator2.default.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  _context2.next = 2;
                  return _this.run('GET_DEVICE_ATTRIBUTES', {
                    deviceID: event.deviceID
                  });

                case 2:
                  attr = _context2.sent;

                  logger.info({ attr: attr }, 'Attributes found');
                  _rabbit2.default.send('DEVICE_STATE', { online: attr });

                case 5:
                case 'end':
                  return _context2.stop();
              }
            }
          }, _callee2, _this);
        }))();
      }
      if (event.data === 'offline') {
        devices[event.deviceID] = false;
        _rabbit2.default.send('DEVICE_STATE', {
          offline: { deviceID: event.deviceID }
        });
      }
    }
  });
  _rabbit2.default.registerReceiver({
    DEVICE_ACTION: function DEVICE_ACTION(eventString, ack) {
      var event = JSON.parse(eventString);
      _this.run(event.action, event.context).then(function (answer) {
        logger.info({ ans: answer, ev: event }, 'Answer found for action');
        ack();
        if (event.answerTo !== undefined) {
          _rabbit2.default.send(event.answerTo, { answer: answer, answerID: event.answerID });
        }
      }).catch(function (err) {
        logger.info({ err: err, ev: event }, 'Error found for action');
        ack();
      });
      return false;
    }
  });
};

exports.default = HeadLessManagers;