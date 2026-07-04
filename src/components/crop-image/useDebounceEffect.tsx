import { useEffect, DependencyList } from 'react'

export function useDebounceEffect(
    fn: () => void,
    waitTime: number,
    deps?: DependencyList,
) {
    useEffect(() => {
        const t = setTimeout(() => {
            // @ts-expect-error legacy: fn args come from the deps array
            fn.apply(undefined, deps)
        }, waitTime)

        return () => {
            clearTimeout(t)
        }
    }, deps)
}
