import { NextFunction, Response } from 'express';
import { RequestIdMiddleware, RequestWithId } from './request-id.middleware';

function buildResponse() {
  const setHeader = jest.fn();
  const res = { setHeader } as unknown as Response;
  return { res, setHeader };
}

describe('RequestIdMiddleware', () => {
  it('should be defined', () => {
    expect(new RequestIdMiddleware()).toBeDefined();
  });

  it('asigna un id con formato UUID al request y lo expone en X-Request-Id', () => {
    const middleware = new RequestIdMiddleware();
    const req = {} as RequestWithId;
    const { res, setHeader } = buildResponse();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toEqual(
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ),
    );
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('genera un id distinto en cada llamada', () => {
    const middleware = new RequestIdMiddleware();
    const req1 = {} as RequestWithId;
    const req2 = {} as RequestWithId;
    const { res } = buildResponse();

    middleware.use(req1, res, jest.fn());
    middleware.use(req2, res, jest.fn());

    expect(req1.id).not.toEqual(req2.id);
  });
});
