import { Container, Grid, SimpleGrid, Skeleton, useMantineTheme } from '@mantine/core';

import { UserAuth } from '../../context/AuthContext';
import { getContacts, updateContact } from "../../context/Data";
import { LoaderData } from '../../context/Loader';

const PRIMARY_COL_HEIGHT = 300;



export function LeadGrid() {
  
  const {user}=UserAuth();
  // console.log(user);

  const theme = useMantineTheme();
  const SECONDARY_COL_HEIGHT = PRIMARY_COL_HEIGHT / 2 - theme.spacing.md / 2;

  return (
    <Container my="md">
    <h1>Profile</h1>
      <h3>Note: This page is under construction, try the forum!</h3>
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