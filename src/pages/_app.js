// @flow

import React from 'react';
import '../App.css';
import '../gifplayer.css';
import 'tippy.js/themes/light-border.css';

import {onegraphAuth, useEnvironment} from '../Environment';
import {RelayEnvironmentProvider} from 'react-relay/hooks';
import UserContext from '../UserContext';
import {NotificationContainer, NotificationContext} from '../Notifications';
import {Grommet} from 'grommet/components/Grommet';
import theme from '../lib/theme';
import Head from '../Head';
import ErrorBoundary from '../ErrorBoundary';
import {useRouter} from 'next/router';

function AppComponent({
  Component,
  pageProps,
  indexPageMemo,
  indexPageScrollPos,
  loginStatus,
  isIndexPage,
}: any) {
  React.useEffect(() => {
    if (isIndexPage && indexPageScrollPos.current) {
      window.scrollTo(0, indexPageScrollPos.current);
    }
  }, [isIndexPage]);

  let page;
  if (!isIndexPage || !indexPageMemo.current) {
    const res = (
      <div style={{position: 'relative'}}>
        <ErrorBoundary>
          <React.Suspense fallback={null}>
            <Component
              key={loginStatus === 'logged-in' ? 'logged-in' : 'logged-out'}
              {...pageProps}
            />
          </React.Suspense>
        </ErrorBoundary>
      </div>
    );
    if (isIndexPage) {
      indexPageMemo.current = res;
    } else {
      page = res;
    }
  }

  // Keep the index page rendered so that we don't lose any posts we loaded
  return (
    <>
      <div style={{display: isIndexPage ? 'block' : 'none'}}>
        {indexPageMemo.current}
      </div>
      {page}
    </>
  );
}

function App({Component, pageProps}: any) {
  const router = useRouter();

  const indexPageMemo = React.useRef();
  // Stores scroll position of the index page for better back behavior
  // Ideally we would assign the scroll pos to the history item in the stack,
  // but that doesn't appear possible with next.js
  const indexPageScrollPos = React.useRef();

  const [loginStatus, setLoginStatus] = React.useReducer(
    (_state, newState) => newState,
    'checking',
  );

  const isIndexPage = router.pathname === '/';

  const handleRouteChangeStart = (x, y, z) => {
    if (isIndexPage) {
      indexPageScrollPos.current = window.scrollY;
    }
  };

  React.useEffect(() => {
    router.events.on('routeChangeStart', handleRouteChangeStart);
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [isIndexPage]);

  const notificationContext = React.useContext(NotificationContext);

  const environment = useEnvironment(pageProps.initialRecords, {
    onCorsError: () => notificationContext.setCorsViolation(),
  });

  React.useEffect(() => {
    onegraphAuth
      .isLoggedIn('github')
      .then(isLoggedIn => {
        setLoginStatus(isLoggedIn ? 'logged-in' : 'logged-out');
      })
      .catch(e => {
        console.error('Error checking login status', e);
        setLoginStatus('error');
      });
  }, []);

  const login = () => {
    onegraphAuth.login('github').then(() =>
      onegraphAuth.isLoggedIn('github').then(isLoggedIn => {
        setLoginStatus(isLoggedIn ? 'logged-in' : 'logged-out');
      }),
    );
  };
  const logout = () => {
    onegraphAuth.logout('github').then(() =>
      onegraphAuth.isLoggedIn('github').then(isLoggedIn => {
        onegraphAuth.destroy();
        setLoginStatus(isLoggedIn ? 'logged-in' : 'logged-out');
      }),
    );
  };

  return (
    <RelayEnvironmentProvider environment={environment}>
      <Head />
      <UserContext.Provider
        value={{
          loginStatus,
          login,
          logout,
        }}>
        <AppComponent
          Component={Component}
          pageProps={pageProps}
          indexPageMemo={indexPageMemo}
          indexPageScrollPos={indexPageScrollPos}
          loginStatus={loginStatus}
          isIndexPage={isIndexPage}
        />
      </UserContext.Provider>
    </RelayEnvironmentProvider>
  );
}

function AppWrapper({Component, pageProps}: any) {
  return (
    <Grommet theme={theme}>
      <NotificationContainer>
        <App Component={Component} pageProps={pageProps} />
      </NotificationContainer>
    </Grommet>
  );
}

export default AppWrapper;
