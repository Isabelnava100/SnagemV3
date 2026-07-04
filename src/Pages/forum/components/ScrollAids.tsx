import React from "react";
import useMediaQuery from "../../../hooks/useMediaQuery";

/**
 * Desktop: sticky "SCROLL TO THE TOP" pill, bottom-left of the main area.
 * Mobile: floating "SKIP TO NEXT POST" pill that anchors to the next post by
 * scroll position; on the last post it becomes scroll-to-top (board 11/12).
 */
export default function ScrollAids(props: { postAnchorIds: string[] }) {
  const { postAnchorIds } = props;
  const { isOverSm } = useMediaQuery();
  const [nextAnchor, setNextAnchor] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOverSm) return;
    const findNext = () => {
      const next = postAnchorIds.find((id) => {
        const el = document.getElementById(id);
        return !!el && el.getBoundingClientRect().top > 120;
      });
      setNextAnchor(next ?? null);
    };
    findNext();
    window.addEventListener("scroll", findNext, { passive: true });
    return () => window.removeEventListener("scroll", findNext);
  }, [isOverSm, postAnchorIds]);

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
        if (!nextAnchor) return scrollToTop();
        document.getElementById(nextAnchor)?.scrollIntoView({ behavior: "smooth" });
      }}
    >
      {nextAnchor ? "SKIP TO NEXT POST" : "SCROLL TO THE TOP"}
    </button>
  );
}
