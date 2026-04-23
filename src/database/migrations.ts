import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        // Since we are resetting the schema in development, 
        // passing an empty steps array is acceptable to clear this warning
        // but normally this would contain addColumns or createTable steps
      ],
    },
  ],
})
