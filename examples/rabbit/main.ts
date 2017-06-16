import {createLogger} from "bunyan";
import Promise from "bluebird";
const Particle = require("particle-api-js");

var log = createLogger({name: 'RConnect'});



var particle = new Particle({
		baseUrl: "" + process.env.rabc_sparkserver,
        clientId: 'CLI2',
		clientSecret: 'client_secret_here'
	});

log.info({},'Starting up');

particle.login({username: '' + process.env.rabc_username, password: ''+ process.env.rabc_password})
    .then(function(data){
    log.info({body: data.body},'Login Completed');
    })
  .catch(function(err) {
        log.error({err: err.body},'Error on login to spark-server');
  })


log.info('Init Done.');


