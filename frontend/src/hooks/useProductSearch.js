import { useState, useEffect, useRef } from 'react';
import { productsAPI } from '../api/services';

const useProductSearch = (field = 'name') => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await productsAPI.search(query, field);
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query, field]);

  return { query, setQuery, results, setResults, loading };
};

export default useProductSearch;
