import { createLogger } from "bunyan";
import Promise from "bluebird";
const Particle = require("particle-api-js");

var log = createLogger({ name: 'RConnect' });



var particle = new Particle({
    baseUrl: "" + process.env.rabc_sparkserver,
    clientId: 'CLI2',
    clientSecret: 'client_secret_here'
});

var token: string
var eventStream: any;

log.info({}, 'Starting up');

particle.login({ username: '' + process.env.rabc_username, password: '' + process.env.rabc_password })
    .then(function (data) {
        log.info({ body: data.body }, 'Login Completed');
        token = data.body.access_token;
        particle.getEventStream({ deviceId: 'mine', auth: token })
            .then(function (stream) {
                eventStream = stream;
                stream.on('event', function (data) {
                    log.info({name : 'Events', device: data.coreid, event: data.name},'Incomming Event');
                });
                stream.on('error', function (err) {
                    log.error({ e: err }, 'Stream has processed error');
                    process.exit(3);
                });
                stream.on('end', function () {
                    log.error('EventStream was Closed, or forced to close!');
                    process.exit(2);
                });
            })
            .catch(function (err) {
                log.error({err: err}, 'Error on getting stream');
            })
    })
    .catch(function (err) {
        log.error({ err: err.body }, 'Error on login to spark-server');
        // Just exit with an error code, cause the server is restarted by the
        // surrounding system if needed!
        process.exit(1);
    })

log.info('Init Done.');


