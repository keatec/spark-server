'use strict';

var _rabbit = require('./lib/rabbit');

var _rabbit2 = _interopRequireDefault(_rabbit);

var _logger = require('./lib/logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = _logger2.default.createModuleLogger(module);

_rabbit2.default.registerReceiver({
    'DEVICE_STATE': function DEVICE_STATE(ev) {
        logger.info({ ev: ev }, 'State');
    },
    'EV_BEAT': function EV_BEAT(ev) {
        logger.info({ ev: ev, dev: ev.deviceID }, 'Beat');
        _rabbit2.default.send('DEVICE_ACTION', { action: 'GET_DEVICE_ATTRIBUTES', context: { deviceID: ev.deviceID } });
    }
});