const crypto = require('crypto');

/** Gives every request an id (also returned as X-Request-Id) so log lines, audit records and bug reports can be tied together. */
module.exports = function requestContext(req, res, next) {
  const incoming = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : '';
  // Only accept a sane client-supplied id; otherwise make our own.
  req.id = /^[A-Za-z0-9._-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
