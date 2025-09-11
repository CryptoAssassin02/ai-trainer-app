/**
 * @fileoverview Mock for the Supabase service module
 */

const getSupabaseClient = jest.fn().mockReturnValue({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null })
});

const getSupabaseAdminClient = jest.fn().mockReturnValue({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null })
});

const handleSupabaseError = jest.fn((error, operation) => {
  throw {
    status: error.status || 500,
    message: error.message || `${operation} failed`,
    details: error.details || {},
    code: error.code || 'SUPABASE_ERROR'
  };
});

const query = jest.fn().mockResolvedValue([]);
const getById = jest.fn().mockResolvedValue(null);
const insert = jest.fn().mockResolvedValue([]);
const update = jest.fn().mockResolvedValue({});
const remove = jest.fn().mockResolvedValue({ success: true });
const rawQuery = jest.fn().mockResolvedValue([]);

module.exports = {
  getSupabaseClient,
  getSupabaseAdminClient,
  handleSupabaseError,
  query,
  getById,
  insert,
  update,
  remove,
  rawQuery
}; 