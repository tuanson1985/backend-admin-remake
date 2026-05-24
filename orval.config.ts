import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: 'http://localhost:3000/api/docs-json',
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      httpClient: 'axios',
      baseUrl: 'http://localhost:3000/api/v1',
      override: {
        mutator: { path: 'src/api/client.ts', name: 'apiClient' },
      },
    },
  },
})
