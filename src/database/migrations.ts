import { addColumns, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

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
    }
  ],
})
