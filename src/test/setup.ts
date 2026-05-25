/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());
