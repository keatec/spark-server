'use strict';

var _rabbit = require('./lib/rabbit');

var _logger = require('./lib/logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = _logger2.default.createModuleLogger(module);

_rabbit.rabbit.registerReceiver({
    'DEVICE_STATE': function DEVICE_STATE(data) {
        logger.info({ data: data }, 'State');
    },
    'EV_BEAT': function EV_BEAT(data) {
        var ev = JSON.parse(data);
        logger.info({ deviceID: ev.deviceID }, 'Beat');
        _rabbit.rabbit.sendAction('GET_DEVICE_ATTRIBUTES', { deviceID: ev.deviceID }).then(function (answer) {
            return logger.info({ answer: answer }, 'Got Answer');
        }).catch(function (err) {
            return logger.error({ err: err }, 'Error');
        });
    }
});