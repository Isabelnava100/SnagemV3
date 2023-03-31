import { useState } from 'react';
import { useInterval } from '@mantine/hooks';
import { Button, Progress } from '@mantine/core';
import '../../../assets/styles/loadingbutton.css';

type Props = { formCheck: boolean };

export function ButtonProgress(props: Props) {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const { formCheck } = props;

  const interval = useInterval(
    () =>
      setProgress((current) => {
        if (current === 100) {
          interval.stop();
          setLoaded(true);
        }else if (current < 100) {
          return current + 1;
        }
        return 0;

      }),
    20
  );
  return (
    <Button
    type="submit"
      fullWidth
      className='buttonLB'
      onClick={() => (loaded ? setLoaded(false) : !interval.active && interval.start())}
      color={'brand'}
       disabled={(formCheck)}
    >
      <div className='labelLB'>
        {progress !== 0 ? 'Loading...' : loaded ? 'Posted! Redirecting...' : 'Make Post'}
      </div>
      {progress !== 0 && (
        <Progress
          value={progress}
          className='progressLB'
          color={'brand'}
          radius="sm"
        />
      )}
    </Button>
  );
}