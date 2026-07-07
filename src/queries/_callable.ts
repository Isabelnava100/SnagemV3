/**
 * Shared wrapper for invoking a Firebase Callable Cloud Function. Every query
 * module used to keep its own private copy of this; import this one instead.
 */
export async function call<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const res = await httpsCallable(getFunctions(), name)(data);
  return res.data as T;
}
