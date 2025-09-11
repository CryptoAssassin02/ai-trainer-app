// Manual mock for backend/services/supabase.js
const SupabaseClientMock = jest.fn().mockImplementation(() => {
    return {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
});

module.exports = {
    SupabaseClient: SupabaseClientMock,
    createSupabaseClient: jest.fn().mockImplementation(() => {
        return new SupabaseClientMock();
    }),
    isDevelopment: jest.fn().mockReturnValue(false),
    isTest: jest.fn().mockReturnValue(true),
    isProduction: jest.fn().mockReturnValue(false),
    getEnvironmentConfig: jest.fn().mockReturnValue({})
}; 