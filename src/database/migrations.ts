import {addColumns, createTable, schemaMigrations} from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 6,
      steps: []
    },
    {
      toVersion: 7,
      steps: [],
    },
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: 'products',
          columns: [
            {name: 'cost', type: 'number'},
          ]
        }),
      ]
    },
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'inventory',
          columns: [
            {name: 'low_stock_threshold', type: 'number'},
          ]
        }),
      ]
    },
    {
      toVersion: 10,
      steps: []
    },
    {
      toVersion: 11,
      steps: [
        createTable({
          name: 'inventory',
          columns: [
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'quantity', type: 'number'},
            {name: 'low_stock_threshold', type: 'number'},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        }),
      ]
    }
  ],
})
