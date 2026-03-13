import { useRef } from "react";

const BORDER = "#232323";

export default function MobileBottomSheet({ onClose, children, zIndex = 2000, maxHeight }) {
  const sheetRef = useRef(null);
  const touchStartY = useRef(null);
  const translateY = useRef(0);

  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      e.preventDefault();
      translateY.current = dy;
      if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const onTouchEnd = () => {
    if (translateY.current > 100) { onClose(); }
    else if (sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)";
      sheetRef.current.style.transition = "transform 0.2s ease-out";
      setTimeout(() => { if (sheetRef.current) sheetRef.current.style.transition = ""; }, 200);
    }
    touchStartY.current = null;
    translateY.current = 0;
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <style>{`
        @keyframes _bsBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes _bsSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
      <div onClick={onClose} aria-hidden="true" style={{ flex: 1, background: "rgba(0,0,0,0.6)", animation: "_bsBackdropIn 0.2s ease-out" }} />
      <div ref={sheetRef} role="dialog" style={{
        background: "#161616", borderTop: `1px solid ${BORDER}`, borderRadius: "16px 16px 0 0",
        padding: "0 16px", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
        animation: "_bsSlideUp 0.25s ease-out",
        ...(maxHeight ? { maxHeight, overflowY: "auto" } : {}),
      }}>
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{ width: "100%", display: "flex", justifyContent: "center", padding: "16px 0", cursor: "grab", touchAction: "none" }}>
          <div aria-hidden="true" style={{ width: 36, height: 4, borderRadius: 2, background: BORDER }} />
        </div>
        {children}
      </div>
    </div>
  );
}
