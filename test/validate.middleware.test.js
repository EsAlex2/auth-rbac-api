const test = require('node:test');
const assert = require('node:assert/strict');
const validateBody = require('../src/middlewares/validate.middleware');

function invokeMiddleware(body) {
  const req = { body };
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  let nextCalled = false;
  validateBody({
    required: ['email', 'password'],
    fields: {
      email: { type: 'string', email: true },
      password: { type: 'string', minLength: 8 },
    },
  })(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

test('accepts valid request bodies', () => {
  const result = invokeMiddleware({
    email: 'user@example.com',
    password: 'securepass',
  });
  assert.equal(result.nextCalled, true);
});

test('rejects missing required fields', () => {
  const result = invokeMiddleware({ email: 'user@example.com' });
  assert.equal(result.res.statusCode, 400);
  assert.equal(result.res.payload.code, 'VALIDATION_ERROR');
  assert.equal(result.res.payload.errors[0].field, 'password');
});

test('rejects invalid email and short password', () => {
  const result = invokeMiddleware({
    email: 'invalid',
    password: 'short',
  });
  assert.equal(result.res.statusCode, 400);
  assert.deepEqual(
    result.res.payload.errors.map((error) => error.field),
    ['email', 'password']
  );
});
