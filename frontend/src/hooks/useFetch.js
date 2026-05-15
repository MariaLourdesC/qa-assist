import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export function useFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  const execute = useCallback(async (fn, showError = true) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      setError(err.message);
      if (showError) {
        addToast(`Error: ${err.message}`, 'error', 5000);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  return { loading, error, execute };
}
