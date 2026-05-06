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
    },
    {
      toVersion: 12,
      steps: [
        addColumns({
          table: 'orders',
          columns: [
            {name: 'grand_total', type: 'number'},
          ]
        })
      ]
    },
    {
      toVersion: 13,
      steps: [
        createTable({
          name: 'orders',
          columns: [
            {name: 'customer_id', type: 'string', isIndexed: true},
            {name: 'user_id', type: 'string', isIndexed: true},
            {name: 'order_date', type: 'number'},
            {name: 'status', type: 'string'},
            {name: 'total_amount', type: 'number'},
            {name: 'discount_type', type: 'string', isOptional: true},
            {name: 'discount_value', type: 'number', isOptional: true},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        })
      ]
    },
    {
      toVersion: 14,
      steps: [
        addColumns({
          table: 'orders',
          columns: [
            {name: 'payment_status', type: 'string'},
            {name: 'due_amount', type: 'number', isOptional: true},
            {name: 'profit_amount', type: 'number', isOptional: true},
          ]
        })
      ]
    },
    {
      toVersion: 15,
      steps: []
    }
  ],
})
