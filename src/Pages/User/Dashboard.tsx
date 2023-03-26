import { Container, Grid, SimpleGrid, Skeleton, useMantineTheme } from '@mantine/core';
import { lazy } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/navigation/loading';
import { myBookmarksInfo } from '../../components/types/typesUsed';
import { UserAuth } from '../../context/AuthContext';
// import { getMyBookmarks } from './components/myBookmarks';

const PRIMARY_COL_HEIGHT = 300;

export function LeadGrid() {

  const theme = useMantineTheme();
  const SECONDARY_COL_HEIGHT = PRIMARY_COL_HEIGHT / 2 - theme.spacing.md / 2;
  const BookmarkModule = lazy(() => import('./components/myBookmarks'));


  return (
    <Container my="md">
    <h1>Profile</h1>
      Note: This page is under construction, try the forum!
      <Suspense fallback={<LoadingSpinner />}>
      <div>
        <h3>Your Bookmarks:</h3>
        <BookmarkModule/>
      </div>
      </Suspense>
      <SimpleGrid cols={2} spacing="md" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        <Skeleton height={PRIMARY_COL_HEIGHT} radius="md" animate={false} />
        <Grid gutter="md">
          <Grid.Col>
            <Skeleton height={SECONDARY_COL_HEIGHT} radius="md" animate={false} />
          </Grid.Col>
          <Grid.Col span={6}>
            <Skeleton height={SECONDARY_COL_HEIGHT} radius="md" animate={false} />
          </Grid.Col>
          <Grid.Col span={6}>
            <Skeleton height={SECONDARY_COL_HEIGHT} radius="md" animate={false} />
          </Grid.Col>
        </Grid>
      </SimpleGrid>
    </Container>
  );
}