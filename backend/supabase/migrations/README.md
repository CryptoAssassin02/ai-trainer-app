# Database Migrations

This directory contains SQL migrations for the trAIner application database. These migrations are executed in alphabetical order to establish and update the database schema.

## How to Create New Migrations

1. **Naming Convention**
   - Use the format: `YYYYMMDDHHMMSS_descriptive_name.sql`
   - Example: `20250327183223_user_profiles.sql`
   - The timestamp prefix ensures migrations run in chronological order

2. **Content Structure**
   - Begin with a comment block explaining the migration's purpose
   - Include relevant details about table structures, relationships, and constraints
   - Group related operations together (e.g., create table, indexes, policies)
   - End with statements to track the migration in the migrations table

3. **Best Practices**
   - Make migrations idempotent with `IF NOT EXISTS` and `IF EXISTS` clauses
   - Use transactions to ensure atomic operations
   - Include explicit dependencies between migrations
   - Document JSONB structures and any non-obvious constraints
   - Consider backward compatibility
   - Include rollback procedures when appropriate

## How to Run Migrations

Migrations can be executed using the provided utility script:

```bash
# Run all pending migrations
npm run migrate

# Run migrations with dry-run option (shows SQL without executing)
npm run migrate -- --dry-run

# List all available migrations
npm run migrate -- --list

# Show migration status (applied/pending)
npm run migrate -- --status

# Run a specific migration
npm run migrate -- --file 20250327183223_user_profiles.sql
```

## Migration Best Practices

1. **Safety First**
   - Always back up your database before running migrations in production
   - Test migrations in a development environment first
   - Consider the impact on existing data
   - Handle errors gracefully and provide rollback options

2. **Schema Design**
   - Use UUIDs for primary keys where appropriate
   - Enable Row Level Security (RLS) for multi-tenant data
   - Create appropriate indexes for performance
   - Use foreign key constraints to maintain referential integrity
   - Leverage PostgreSQL-specific features when beneficial (JSONB, vector search, etc.)

3. **Performance Considerations**
   - Be cautious with migrations that modify large tables
   - Consider running data-intensive migrations during off-peak hours
   - Break large migrations into smaller, manageable chunks
   - Add appropriate indexes to support common queries

4. **Security**
   - Implement RLS policies to control data access
   - Set appropriate permissions for database objects
   - Never store sensitive data in plain text
   - Use parameterized queries to prevent SQL injection

## Troubleshooting

If you encounter issues with migrations:

1. Check the migration logs for error details
2. Verify that all dependencies are properly installed
3. Ensure your database connection parameters are correct
4. Review the SQL statements for syntax errors
5. Confirm that the Supabase service role key has sufficient permissions 