// FIND-08 regression: errorHandler used to fall back to a generic message
// only when err.message was falsy, which real Error objects almost never
// are - so any unexpected error (raw Mongoose CastError, driver error,
// TypeError) leaked its raw internal message to the client. Every
// deliberately-thrown business error in this codebase sets err.status
// explicitly at its throw site; anything without .status is therefore
// genuinely unexpected and must always get the fixed generic message.
const { errorHandler } = require('../../src/shared/middleware/error');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler (FIND-08)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('replaces a genuinely unexpected error (no .status) with the generic message, regardless of what it says', () => {
    const res = mockRes();
    const err = new Error('E11000 duplicate key error collection: realestate.users index: agencyId_1_email_1 dup key: { agencyId: ObjectId("..."), email: "x@y.com" }');
    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    // Full detail still logged server-side.
    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
  });

  it('replaces a raw CastError-shaped error (no .status) the same way', () => {
    const res = mockRes();
    const err = new Error('Cast to ObjectId failed for value "not-an-id" (type string) at path "_id" for model "Property"');
    err.name = 'CastError';
    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  it('preserves a deliberately-thrown business error message exactly (has .status)', () => {
    const res = mockRes();
    const err = new Error('Invalid email or password');
    err.status = 401;
    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
  });

  it('preserves every deliberate status code exactly (403/404/409/402/503), not just 401', () => {
    const res = mockRes();
    for (const [status, message] of [
      [403, 'Forbidden: insufficient role'],
      [404, 'Property not found'],
      [409, 'An account with this email already exists'],
      [402, 'Your free trial has ended. Please upgrade your subscription to continue using DreamHomes.'],
      [503, 'Storage provider is not configured'],
    ]) {
      const err = new Error(message);
      err.status = status;
      errorHandler(err, {}, res, () => {});
      expect(res.status).toHaveBeenLastCalledWith(status);
      expect(res.json).toHaveBeenLastCalledWith({ message });
    }
  });

  it('falls back to the generic message if a business error somehow has .status but no message', () => {
    const res = mockRes();
    const err = new Error();
    err.status = 400;
    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});
