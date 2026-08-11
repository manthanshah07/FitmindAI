import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // If navigation is triggered by back/forward buttons,
    // the browser will natively attempt to restore the scroll position.
    if (navType === 'POP') {
      return;
    }

    if (hash) {
      // If there's a hash link, wait a tick for the DOM to render the new page,
      // then find the element and scroll to it.
      setTimeout(() => {
        const elementId = hash.replace('#', '');
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 0);
    } else {
      // Standard route navigation without a hash: scroll to top
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash, navType]);

  return null;
};

export default ScrollToTop;
