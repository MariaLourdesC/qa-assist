import { useState, useCallback } from 'react';
import { analysesApi } from '../api/client';

export function useAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);

  const fetchVersions = useCallback(async (storyId) => {
    try {
      const data = await analysesApi.getAll(storyId);
      setVersions(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        setCurrentVersion(data[0].id);
        setAnalysis(data[0]);
      }
    } catch (err) {
      console.error('Error fetching versions:', err);
    }
  }, []);

  const switchVersion = useCallback((versionId) => {
    const selected = versions.find(v => v.id === versionId);
    if (selected) {
      setCurrentVersion(versionId);
      setAnalysis(selected);
    }
  }, [versions]);

  const deleteVersion = useCallback(async (versionId) => {
    await analysesApi.delete(versionId);
    const remaining = versions.filter(v => v.id !== versionId);
    setVersions(remaining);
    if (currentVersion === versionId) {
      if (remaining.length > 0) {
        setCurrentVersion(remaining[0].id);
        setAnalysis(remaining[0]);
      } else {
        setCurrentVersion(null);
        setAnalysis(null);
      }
    }
  }, [versions, currentVersion]);

  const reset = useCallback(() => {
    setAnalysis(null);
    setVersions([]);
    setCurrentVersion(null);
  }, []);

  return { analysis, versions, currentVersion, fetchVersions, switchVersion, deleteVersion, reset };
}
