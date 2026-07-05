jest.mock('../src/config/db', () => ({ query: jest.fn() }));
const pool = require('../src/config/db');
const { requireBoardAccess } = require('../src/middleware/boardAccess');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });

describe('requireBoardAccess middleware', () => {
  afterEach(() => jest.clearAllMocks());

  it('blocks a user who is not a workspace member', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const req = { params: { boardId: 'board-1' }, body: {}, user: { id: 'user-1' } };
    const res = mockRes();
    const next = jest.fn();
    await requireBoardAccess()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a member and attaches workspaceRole', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
    const req = { params: { boardId: 'board-1' }, body: {}, user: { id: 'user-1' } };
    const res = mockRes();
    const next = jest.fn();
    await requireBoardAccess()(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.workspaceRole).toBe('member');
  });

  it('rejects a member-role user from an admin-only action', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
    const req = { params: { boardId: 'board-1' }, body: {}, user: { id: 'user-1' } };
    const res = mockRes();
    const next = jest.fn();
    await requireBoardAccess('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
