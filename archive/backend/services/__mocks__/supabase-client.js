// Manual mock for supabase-client
module.exports = {
    SupabaseClient: jest.fn().mockImplementation(() => {
        return {};
    })
}; 