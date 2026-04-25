import {createTable, schemaMigrations} from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 6,
      steps: []
    },
    {
      toVersion: 7,
      steps: [
        // Since we are resetting the schema in development, 
        // passing an empty steps array is acceptable to clear this warning
        // but normally this would contain addColumns or createTable steps
        createTable({
          name: 'users',
          columns: [
            {name: 'name', type: 'string'},
            {name: 'email', type: 'string'},
            {name: 'password_hash', type: 'string', isOptional: true},
            {name: 'role', type: 'string', isOptional: true},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        }),

        createTable({
          name: 'customers',
          columns: [
            {name: 'name', type: 'string'},
            {name: 'email', type: 'string', isOptional: true},
            {name: 'phone', type: 'string', isOptional: true},
            {name: 'address', type: 'string', isOptional: true},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        }),

        createTable({
          name: 'suppliers',
          columns: [
            {name: 'name', type: 'string'},
            {name: 'contact_name', type: 'string', isOptional: true},
            {name: 'email', type: 'string', isOptional: true},
            {name: 'phone', type: 'string', isOptional: true},
            {name: 'address', type: 'string', isOptional: true},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        }),

        createTable({
          name: 'products',
          columns: [
            {name: 'name', type: 'string'},
            {name: 'sku', type: 'string', isOptional: true},
            {name: 'description', type: 'string', isOptional: true},
            {name: 'price', type: 'number'},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        }),

        createTable({
          name: 'product_images',
          columns: [
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'image_url', type: 'string'},
            {name: 'is_primary', type: 'boolean'},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        }),

        createTable({
          name: 'inventory',
          columns: [
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'quantity', type: 'number'},
            {name: 'location', type: 'string', isOptional: true},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        }),

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
        }),

        createTable({
          name: 'order_items',
          columns: [
            {name: 'order_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'quantity', type: 'number'},
            {name: 'unit_price', type: 'number'},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        }),

        createTable({
          name: 'purchase_orders',
          columns: [
            {name: 'supplier_id', type: 'string', isIndexed: true},
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
        }),

        createTable({
          name: 'purchase_order_items',
          columns: [
            {name: 'purchase_order_id', type: 'string', isIndexed: true},
            {name: 'product_id', type: 'string', isIndexed: true},
            {name: 'quantity', type: 'number'},
            {name: 'unit_price', type: 'number'},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        }),

        // ✅ UPDATED TABLE
        createTable({
          name: 'transactions',
          columns: [
            {name: 'order_id', type: 'string', isIndexed: true, isOptional: true},
            {name: 'purchase_order_id', type: 'string', isIndexed: true, isOptional: true},
            {name: 'type', type: 'string'}, // 'payment' | 'refund'
            {name: 'amount', type: 'number'},
            {name: 'payment_date', type: 'number'},
            {name: 'created_at', type: 'number'},
            {name: 'updated_at', type: 'number'},
            {name: 'last_modified', type: 'number', isOptional: true},
            {name: 'server_deleted_at', type: 'number', isOptional: true},
          ]
        })


      ],
    },
  ],
})
