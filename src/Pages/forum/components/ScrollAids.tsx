import React from "react";
import useMediaQuery from "../../../hooks/useMediaQuery";

/**
 * Desktop: sticky "SCROLL TO THE TOP" pill, bottom-left of the main area.
 * Mobile: floating "SKIP TO NEXT POST" pill that anchors to the next post by
 * scroll position; on the last post it becomes scroll-to-top (board 11/12).
 */
// A post counts as "below" the fold once its top clears the sticky header zone.
const NEXT_POST_OFFSET = 130;

export default function ScrollAids(props: { postAnchorIds: string[] }) {
  const { postAnchorIds } = props;
  const { isOverSm } = useMediaQuery();
  const [hasNext, setHasNext] = React.useState(false);

  // Find the first post still below the current scroll position. Computed fresh
  // (not read from stale state) so every tap advances, not just the first.
  const findNextId = React.useCallback((): string | null => {
    return (
      postAnchorIds.find((id) => {
        const el = document.getElementById(id);
        return !!el && el.getBoundingClientRect().top > NEXT_POST_OFFSET;
      }) ?? null
    );
  }, [postAnchorIds]);

  React.useEffect(() => {
    if (isOverSm) return;
    const update = () => setHasNext(!!findNextId());
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isOverSm, findNextId]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (isOverSm) {
    return (
      <button type="button" className="forum-scroll-pill" style={{ left: 24 }} onClick={scrollToTop}>
        SCROLL TO THE TOP
      </button>
    );
  }

  return (
    <button
      type="button"
      className="forum-scroll-pill"
      style={{ left: 16 }}
      onClick={() => {
        const nextId = findNextId();
        if (!nextId) return scrollToTop();
        document.getElementById(nextId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        // Reflect that a further post may now exist above the fold.
        setHasNext(true);
      }}
    >
      {hasNext ? "SKIP TO NEXT POST" : "SCROLL TO THE TOP"}
    </button>
  );
}
