import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api';

// ─── Generic fetch hook ─────────────────────────────────
export function useApi(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { autoRefresh = 0, enabled = true, fullResponse = false } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}${endpoint}`);
      const json = await res.json();
      if (json.success) {
        setData(fullResponse ? json : (json.data || json));
      } else {
        setError(json.error || 'Unknown error');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled, fullResponse]);

  useEffect(() => {
    fetchData();

    if (autoRefresh > 0) {
      const interval = setInterval(fetchData, autoRefresh);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh]);

  return { data, loading, error, refetch: fetchData };
}

// ─── Dashboard data hook ────────────────────────────────
export function useDashboard() {
  return useApi('/dashboard', { autoRefresh: 0 });
}

// ─── Party tree data hook ───────────────────────────────
export function usePartyTree() {
  return useApi('/parties/tree', { autoRefresh: 0 });
}

// ─── Constituencies hook ────────────────────────────────
export function useConstituencies(params = {}) {
  const query = new URLSearchParams(params).toString();
  return useApi(`/constituencies?${query}`, { autoRefresh: 0 });
}

// ─── Constituency detail hook ───────────────────────────
export function useConstituency(id) {
  return useApi(`/constituency/${id}`, { enabled: !!id, autoRefresh: 0 });
}

// ─── Predictions hook ───────────────────────────────────
export function usePredictions() {
  const { data: raw, loading, error, refetch } = useApi('/predictions', { autoRefresh: 0, fullResponse: true });
  
  return {
    data: raw?.data || [],
    scenarios: raw?.scenarios || [],
    seatRanges: raw?.seatRanges || {},
    electionInfo: raw?.electionInfo || {},
    loading,
    error,
    refetch,
  };
}

// ─── Divisions hook ─────────────────────────────────────
export function useDivisions() {
  return useApi('/divisions', { autoRefresh: 0 });
}

// ─── News ticker hook ───────────────────────────────────
export function useNewsTicker() {
  return useApi('/news', { autoRefresh: 0 });
}

// ─── SSE (Server-Sent Events) hook ──────────────────────
export function useSSE() {
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected, setConnected] = useState(false);
  const [breaking, setBreaking] = useState([]);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const eventSource = new EventSource('/sse/live');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      console.log('📡 SSE connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'connected':
            setConnected(true);
            break;
          case 'result_update':
            setLastUpdate(data);
            break;
          case 'prediction_update':
            setLastUpdate(data);
            break;
          case 'breaking':
            setBreaking(prev => [data, ...prev].slice(0, 10));
            break;
          case 'heartbeat':
            break;
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      console.log('📡 SSE disconnected, retrying...');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { lastUpdate, connected, breaking };
}

// ─── Search hook ────────────────────────────────────────
export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setResults(json.data || []);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, search };
}

// ─── Posts hook ──────────────────────────────────────────
export function usePosts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return useApi(`/posts?${query}`);
}

// ─── Single post hook ───────────────────────────────────
export function usePost(slug) {
  return useApi(`/posts/${slug}`, { enabled: !!slug });
}

// ─── Podcasts hook ──────────────────────────────────────
export function usePodcasts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return useApi(`/podcasts?${query}`);
}

// ─── Single podcast hook ────────────────────────────────
export function usePodcast(slug) {
  return useApi(`/podcasts/${slug}`, { enabled: !!slug });
}

// ─── Streams hook ───────────────────────────────────────
export function useStreams(params = {}) {
  const query = new URLSearchParams(params).toString();
  return useApi(`/streams?${query}`);
}

// ─── Comments hook ──────────────────────────────────────
export function useComments(contentType, contentId) {
  return useApi(`/comments/${contentType}/${contentId}`, {
    enabled: !!contentType && !!contentId
  });
}

// ─── Post comment hook ──────────────────────────────────
export function usePostComment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const postComment = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const likeComment = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/comments/${id}/like`, { method: 'POST' });
      const json = await res.json();
      return json.data;
    } catch (err) {
      return null;
    }
  }, []);

  return { postComment, likeComment, loading, error };
}

// ─── Categories hook ────────────────────────────────────
export function useCategories() {
  return useApi('/categories');
}
