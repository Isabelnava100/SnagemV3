import { Button, Stack, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { OwnedPokemon } from "../types/typesUsed";
import { purifyShadowPokemon } from "../../queries/evolution";

/**
 * Cure a shadowed pokemon with a Shadow Vaccine. Shows only when the pokemon
 * carries shadow. The server checks for the item, spends it, resets shadow to
 * 0 and banks the cleared amount as purification.
 */
export default function ShadowVaccineButton(props: { pokemon: OwnedPokemon }) {
  const { pokemon } = props;
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState("");

  const mutation = useMutation({
    mutationFn: () => purifyShadowPokemon(pokemon.id),
    onSuccess: () => {
      setMessage("Purified! Shadow cleared.");
      queryClient.invalidateQueries({ queryKey: ["get-owned-pokemons"] });
      queryClient.invalidateQueries({ queryKey: ["owned-pokemons"] });
      queryClient.invalidateQueries({ queryKey: ["get-items"] });
    },
    onError: (e: unknown) =>
      setMessage((e as { message?: string })?.message?.replace(/^[^:]*:\s*/, "") || "Could not purify."),
  });

  if ((pokemon.shadow ?? 0) <= 0) return null;

  return (
    <Stack gap={4}>
      <Button
        size="xs"
        radius="xl"
        color="grape"
        variant="light"
        loading={mutation.isPending}
        onClick={() => {
          setMessage("");
          mutation.mutateAsync().catch(() => undefined);
        }}
      >
        Use Shadow Vaccine (purify)
      </Button>
      {message && (
        <Text fz={11} c="grape.3" role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Stack>
  );
}
