import { isAllowedType, getMaxSize } from '../src/utils/validation.js';

describe('Validation Utilities', () => {
  test('isAllowedType should identify valid types', () => {
    expect(isAllowedType('image/jpeg')).toBe(true);
    expect(isAllowedType('video/mp4')).toBe(true);
    expect(isAllowedType('application/pdf')).toBe(true);
  });

  test('isAllowedType should reject invalid types', () => {
    expect(isAllowedType('text/plain')).toBe(false);
    expect(isAllowedType('application/zip')).toBe(false);
  });

  test('getMaxSize should return correct limits', () => {
    expect(getMaxSize('image/jpeg')).toBe(10 * 1024 * 1024);
    expect(getMaxSize('video/mp4')).toBe(200 * 1024 * 1024);
  });
});
