import { LoadingOverlay } from "@mantine/core";

export default function LoadingSpinner() {
  return (
    <img
      src="https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/mewdumpy-compress.gif?alt=media&token=95a14be6-6495-43fd-a72a-a120f55e0bf8"
      alt="mew loading"
      style={{ maxWidth: "100px", minWidth: "100px" }}
    />
  );
}

export function Loader() {
  return <LoadingOverlay visible loader={<LoadingSpinner />} />;
}
