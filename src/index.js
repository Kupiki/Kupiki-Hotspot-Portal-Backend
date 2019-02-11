import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import Sequelize from 'sequelize';
import config from './config.json';

const { RateLimiterMemory } = require('rate-limiter-flexible');

const limiterRegisterBruteByIP = new RateLimiterMemory({
  points: config.register.maxRegisterConsecutiveFails,
  duration: config.register.intervalRegisterConsecutiveFails,
});

const dbFreeradius = {
	Sequelize,
	sequelize: new Sequelize(config.sequelize.freeradius)
};
dbFreeradius.radcheck = dbFreeradius.sequelize.import('./models/radcheck.js');

let app = express();

app.server = http.createServer(app);
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

function handleError(res, statusCode) {
    statusCode = statusCode || 500;
    return function(err) {
      return res.status(statusCode).json({status: 'failed', message: err });
    };
  }

app.post('/register', function (req, res) {
	req.headers.origin && res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
	limiterRegisterBruteByIP.consume(req.connection.remoteAddress)
	.then(() => {
		if (!config.register.active) return res.status(200).json({status: 'failed', message: 'Registration not allowed' });
		if (!req.body.username || !req.body.password) return res.status(200).json({status: 'failed', message: 'Wrong request structure' });
		// res.status(200).json({status: 'success', message: 'New user created. Now you can log in.' });
		dbFreeradius.radcheck.findOne({
			where: {
			  username: req.body.username
			},
			attributes: { exclude : ['id', 'username', 'createdAt', 'updatedAt'] }
		  }).then(userCheckAttributes => {
			  // console.log(userCheckAttributes.length)
				if (userCheckAttributes) return res.status(200).json({status: 'failed', message: 'User already exists.' });
				dbFreeradius.radcheck.create({
					username: req.body.username,
					attribute: 'Cleartext-Password',
					op: ':=',
					value: req.body.password
				})
					.then( () => {
						res.status(200).json({status: 'success', message: 'New user created. Now you can log in.' });
					})
					.catch( () => {
						res.status(200).json({status: 'failed', message: 'Unable to create the user.' });
					})
		  }).catch(handleError(res));
	})
	.catch((rejRes) => {
		const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
		res.set('Retry-After', String(secs));
		res.status(429).send('Too many registration requests. Try again later.');
	});
});

dbFreeradius.sequelize.sync().then(
	app.server.listen(process.env.PORT || config.server_port, () => {
		console.log(`Started on port ${app.server.address().port}`);
	})
);

export default app;