var env = require('var'),
    _ = require('lodash'),
    converter = require('./api/converter'),
    device = require('./api/device'),
    session = require('./api/session'),
    system = require('./api/system'),
    user = require('./api/user');

// Create Server
var server = require('socket.io').listen(parseInt(env.port));
server.set('log level', env.logLevel);
server.sockets.on('connection', function (client) {
  // General
  client.on('error', function (error) {
    console.error(error.stack || error);
  });

  // Converter
  client.on('get:converters', call(converter.index));
  client.on('get:converter', call(converter.show));
  client.on('create:converter', call(converter.create));
  client.on('update:converter', call(converter.update));
  client.on('destroy:converter', call(converter.destroy));

  // Device
  client.on('get:devices', call(device.index));
  client.on('get:device', call(device.show));
  client.on('create:device', call(device.create));
  client.on('update:device', call(device.update));
  client.on('destroy:device', call(device.destroy));

  // Session
  client.on('create:session', call(session.create));
  client.on('destroy:session', call(session.destroy));
  client.on('refresh:session', call(session.refresh));

  // System
  client.on('get:systems', call(system.index));
  client.on('get:system', call(system.show));
  client.on('create:system', call(system.create));
  client.on('update:system', call(system.update));
  client.on('destroy:system', call(system.destroy));

  // Users
  client.on('get:users', call(user.index));
  client.on('get:user', call(user.show));
  client.on('create:user', call(user.create));
  client.on('update:user', call(user.update));

  function call(fn) {
    return function (req, next) {
      if (!req) req = {};
      if (!req.data) req.data = {};

      if (fn !== session.destroy) {
        if (!client.handshake.session && req[env.sessionKeyField]) { // Attempt to parse the session key
          client.handshake.session = session.decrypt(req[env.sessionKeyField]);
          if (!client.handshake.session) {
            client.emit('error', 'BAD_REQUEST');
            return next('BAD_REQUEST');
          }
        }

        if (client.handshake.session) { // Check session expiration
          var sessionLength = new Date().getTime() - client.handshake.session.timestamp;
          var maxSessionLength = client.handshake.session.remember ? env.maxExtendedSessionLength : env.maxSessionLength;
          if (sessionLength > maxSessionLength) {
            client.emit('error', 'SESSION_EXPIRED');
            return next('SESSION_EXPIRED');
          }
        }
      }

      fn(req.data, client, function (error, data) {
        if (error) {
          console.error(error.stack || error);
          client.emit('error', error);
        }

        if (next) {
          if (!data) data = {};
          var res = { data: data };
          res[env.sessionKeyField] = session.encrypt(client.handshake.session);

          return next(error, res);
        }
      }, server);
    };
  }
});

console.log('Server started on port', env.port);
if (env.logLevel > 1) {
  console.log(env);
}
