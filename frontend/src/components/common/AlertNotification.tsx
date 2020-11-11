import { Box, useTheme } from '@material-ui/core';
import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { testAuth } from '../../lib/k8s/apiProxy';
import { getRoutePath, ROUTES } from '../../lib/router';
import { useTypedSelector } from '../../redux/reducers/reducers';

const NOT_FOUND_ERROR_MESSAGE = 'Error: Api request error: Bad Gateway';

// in ms
const NETWORK_STATUS_CHECK_TIME = 5000;

export default function AlertNotification(){
  const routes = useTypedSelector(state => state.ui.routes);
  const [networkStatusCheckTimeFactor, setNetworkStatusCheckTimeFactor] = React.useState(0);
  const [error, setError] = React.useState<null | string | boolean>(null);
  const [intervalID, setIntervalID] = React.useState<NodeJS.Timeout | null>(null);

  function registerSetInterval(): NodeJS.Timeout {
    return setInterval(() => {
      setError(null);
      testAuth().then(() => {
        setError(false);
      })
        .catch((err) => {
          const error = new Error(err);
          setError(error.message);
          setNetworkStatusCheckTimeFactor(networkStatusCheckTimeFactor =>
            networkStatusCheckTimeFactor + 1);
        });
    }, (networkStatusCheckTimeFactor + 1) * NETWORK_STATUS_CHECK_TIME);
  }

  React.useEffect(() => {
    const id = registerSetInterval();
    setIntervalID(id);
    return () => clearInterval(id);
  },
  // eslint-disable-next-line
  []);

  React.useEffect(() => {
    if (intervalID) {
      clearInterval(intervalID);
    }
    const id = registerSetInterval();
    setIntervalID(id);
    return () => clearInterval(id);
  },
  // eslint-disable-next-line
  [networkStatusCheckTimeFactor]);

  function checkWhetherInNoAuthRequireRoute():boolean {
    const noAuthRequiringRoutes =
            Object.values(ROUTES)
              .concat(Object.values(routes))
              .filter((route) => route.noAuthRequired);

    for (const route of noAuthRequiringRoutes) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const routeMatch = useRouteMatch({
        path: getRoutePath(route),
        strict: true
      });
      if (routeMatch && routeMatch.isExact) {
        return true;
      }
    }
    return false;
  }

  const whetherInNoAuthRoute = checkWhetherInNoAuthRequireRoute();
  let isErrorInNoAuthRequiredRoute = false;
  if (whetherInNoAuthRoute) {
    isErrorInNoAuthRequiredRoute = true;
  }
  const theme = useTheme();
  if (!error) {
    return null;
  }

  if (isErrorInNoAuthRequiredRoute && error !== NOT_FOUND_ERROR_MESSAGE) {
    return null;
  }
  return (
    <Box
      bgcolor="error.main"
      color={theme.palette.common.white}
      textAlign="center"
      display="flex"
      p={1}
      justifyContent="center"
      position="fixed"
      zIndex={1400}
      width="100%"
      top={whetherInNoAuthRoute ? '0' : '9vh'}
    >
      <Box>
        Something Went Wrong.
      </Box>
      <Box
        bgcolor={theme.palette.common.white}
        color="error.main"
        ml={1}
        px={1}
        py={0.1}
        style={{cursor: 'pointer'}}
        onClick={() => setNetworkStatusCheckTimeFactor(0)}
      >
        Try Again
      </Box>
    </Box>
  );
}
