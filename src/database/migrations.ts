import {createTable, schemaMigrations} from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 4,
      steps: [
        // Since we are resetting the schema in development, 
        // passing an empty steps array is acceptable to clear this warning
        // but normally this would contain addColumns or createTable steps
        createTable({
          name: 'product_images',
          columns: [
            { name: 'product_id', type: 'string' },
            { name: 'image_url', type: 'string' },
            { name: 'is_primary', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'last_modified', type: 'number', isOptional: true },
            { name: 'server_deleted_at', type: 'number', isOptional: true },
          ]
        })
      ],
    },
  ],
})
