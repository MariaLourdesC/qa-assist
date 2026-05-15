import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js', 'tests/integration/**/*.test.js'],
    globals: false,        // explicit imports — no implicit describe/it/expect globals
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**/*.js'],
      exclude: [
        'src/services/ia-enrichment.service.js'  // skip: requires Anthropic SDK at runtime
      ],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        // NOTE: V8 re-instruments modules imported from multiple test files,
        // causing branch counts to vary. Thresholds are set conservatively
        // to detect serious regression without chasing instrumentation noise.
        // Use `npm run test:coverage` to see actual values; raise thresholds
        // as new tests are added.
        'src/services/story-parser.service.js':          { lines: 60, branches: 28, functions: 50, statements: 60 },
        'src/services/functional-classifier.service.js': { lines: 90, branches: 88, functions: 80, statements: 90 },
        'src/services/dedupe-compact.service.js':         { lines: 70, branches: 38, functions: 58, statements: 70 },
        'src/services/scoring.service.js':                { lines: 95, branches: 90, functions: 95, statements: 95 },
        'src/services/quality-checks.service.js':         { lines: 88, branches: 65, functions: 95, statements: 88 },
        'src/services/qa-rules-engine.service.js':        { lines: 90, branches: 60, functions: 80, statements: 90 }
      }
    }
  }
});
