import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'index.ts',
  },
  splitting: false,
  dts: true,
  sourcemap: true,
  clean: true
})