import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    // We start at schema version 1, so the migrations array is empty right now.
    // When you change the schema (e.g., adding a table), you will change version to 2
    // and add the step here!
  ],
})
