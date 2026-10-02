import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * A string state stored in the URL query (`?key=value`) so refresh, Back and
 * shared links restore it. Unknown values fall back to `defaultValue`; the
 * default is omitted from the URL to keep links clean.
 *
 * @param {string} key
 * @param {string} defaultValue
 * @param {{ allowed?: string[], replace?: boolean }} options
 */
export function useSearchParamState(key, defaultValue, { allowed, replace = false } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const search = location?.search || "";

  const value = useMemo(() => {
    const raw = new URLSearchParams(search).get(key);
    if (!raw) return defaultValue;
    if (allowed && !allowed.includes(raw)) return defaultValue;
    return raw;
  }, [allowed, defaultValue, key, search]);

  const setValue = useCallback((next) => {
    const params = new URLSearchParams(search);
    if (!next || next === defaultValue) params.delete(key);
    else params.set(key, next);
    const query = params.toString();
    navigate({ pathname: location?.pathname, search: query ? `?${query}` : "" }, { replace });
  }, [defaultValue, key, location?.pathname, navigate, replace, search]);

  return [value, setValue];
}
