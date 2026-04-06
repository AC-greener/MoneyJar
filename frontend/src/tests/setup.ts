import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom'

// Cleanup after each test
afterEach(() => {
  cleanup()
})
