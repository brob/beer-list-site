import { useEffect, useMemo, useRef } from 'react';
import pkg from 'lodash';
const {debounce} = pkg;

const useDebounce = (callback) => {
    const ref = useRef();
  
    useEffect(() => {
      ref.current = callback;
    }, [callback]);
  
    const debouncedCallback = useMemo(() => {
      const func = () => {
        ref.current?.();
      };
  
      return debounce(func, 1000);
    }, []);
  
    return debouncedCallback;
  };

    export default useDebounce;