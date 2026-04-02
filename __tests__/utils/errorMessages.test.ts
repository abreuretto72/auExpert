/**
 * Tests for getErrorMessage — error-to-user-message mapping.
 * Validates that technical errors are correctly mapped to i18n keys
 * without leaking stack traces or HTTP codes to the user.
 */

// ── Minimal i18n mock (returns the key so we can assert on mapping) ──

jest.mock('../../i18n', () => ({
  t: (key: string) => key,
}));

import { getErrorMessage } from '../../utils/errorMessages';

describe('getErrorMessage', () => {
  it('returns generic for null/undefined', () => {
    expect(getErrorMessage(null)).toBe('errors.generic');
    expect(getErrorMessage(undefined)).toBe('errors.generic');
  });

  it('maps status 500 → errors.server', () => {
    expect(getErrorMessage({ status: 500 })).toBe('errors.server');
  });

  it('maps status 502, 503 → errors.server', () => {
    expect(getErrorMessage({ status: 502 })).toBe('errors.server');
    expect(getErrorMessage({ status: 503 })).toBe('errors.server');
  });

  it('maps status 401 → errors.sessionExpired', () => {
    expect(getErrorMessage({ status: 401 })).toBe('errors.sessionExpired');
  });

  it('maps status 403 → errors.sessionExpired', () => {
    expect(getErrorMessage({ status: 403 })).toBe('errors.sessionExpired');
  });

  it('maps status 404 → errors.notFound', () => {
    expect(getErrorMessage({ status: 404 })).toBe('errors.notFound');
  });

  it('maps status 409 → errors.conflict', () => {
    expect(getErrorMessage({ status: 409 })).toBe('errors.conflict');
  });

  it('maps status 422 → errors.validation', () => {
    expect(getErrorMessage({ status: 422 })).toBe('errors.validation');
  });

  it('maps status 429 → errors.rateLimited', () => {
    expect(getErrorMessage({ status: 429 })).toBe('errors.rateLimited');
  });

  it('maps TypeError with "Network" message → errors.network', () => {
    const err = new TypeError('Network request failed');
    expect(getErrorMessage(err)).toBe('errors.network');
  });

  it('maps error with message containing "timeout" → errors.network', () => {
    expect(getErrorMessage({ message: 'Request timeout exceeded' })).toBe('errors.network');
    expect(getErrorMessage({ message: 'TIMEOUT' })).toBe('errors.network');
  });

  it('maps error with message containing "network" → errors.network', () => {
    expect(getErrorMessage({ message: 'network error occurred' })).toBe('errors.network');
  });

  it('maps error with code "network" → errors.network', () => {
    expect(getErrorMessage({ code: 'network' })).toBe('errors.network');
  });

  it('returns generic for unknown status', () => {
    expect(getErrorMessage({ status: 418 })).toBe('errors.generic');
  });

  it('returns generic for plain Error without special message', () => {
    expect(getErrorMessage(new Error('Something completely unknown'))).toBe('errors.generic');
  });

  it('returns generic for plain string error', () => {
    expect(getErrorMessage('some error string')).toBe('errors.generic');
  });

  it('prefers status over message when both are present', () => {
    // status 401 should take precedence over a "network" message
    expect(getErrorMessage({ status: 401, message: 'network failure' })).toBe('errors.sessionExpired');
  });
});
