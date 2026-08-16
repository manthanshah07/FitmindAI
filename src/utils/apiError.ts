import { isAxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/auth';

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;

    if (data?.detail) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail.map((err) => err.msg).join(', ');
      }
    }

    if (error.response?.status === 401) {
      return 'Authentication failed. Please check your credentials.';
    }

    if (error.response?.status === 403) {
      return 'Access forbidden. Your account may be inactive.';
    }

    if (error.response?.status === 422) {
      return 'Validation error. Please check your input fields.';
    }

    if (error.response?.status && error.response.status >= 500) {
      return 'Server error. Please try again later.';
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      return 'Network error. Unable to reach backend server.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
