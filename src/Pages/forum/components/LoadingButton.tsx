import { useState } from 'react';
import { useInterval } from '@mantine/hooks';
import { createStyles, Button, Progress } from '@mantine/core';

const useStyles = createStyles(() => ({
  button: {
    position: 'relative',
    transition: 'background-color 150ms ease',
  },

  progress: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    left: -1,
    top: -1,
    height: 'auto',
    backgroundColor: 'transparent',
    zIndex: 0,
  },

  label: {
    position: 'relative',
    zIndex: 1,
  },
}));


type Props = { formCheck: boolean };

export function ButtonProgress(props: Props) {
  const { classes, theme } = useStyles();
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const { formCheck } = props;

  const interval = useInterval(
    () =>
      setProgress((current) => {
        if (current < 100) {
          return current + 1;
        }

        interval.stop();
        setLoaded(true);
        return 0;
      }),
    20
  );
  return (
    <Button
    type="submit"
      fullWidth
      className={classes.button}
      onClick={() => (loaded ? setLoaded(false) : !interval.active && interval.start())}
      color={loaded ? 'teal' : theme.primaryColor}
       disabled={(formCheck)}
    >
      <div className={classes.label}>
        {progress !== 0 ? 'Loading...' : loaded ? 'Posted! Redirecting...' : 'Make Post'}
      </div>
      {progress !== 0 && (
        <Progress
          value={progress}
          className={classes.progress}
          color={theme.fn.rgba(theme.colors[theme.primaryColor][2], 0.35)}
          radius="sm"
        />
      )}
    </Button>
  );
}