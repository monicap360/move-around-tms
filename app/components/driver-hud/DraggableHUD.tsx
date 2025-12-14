import React, { useRef } from "react";

export interface DraggableHUDProps {
  children: React.ReactNode;
  id: string;
  onMove?: (id: string, x: number, y: number) => void;
  style?: React.CSSProperties;
}

export const DraggableHUD: React.FC<DraggableHUDProps> = ({ children, id, onMove, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  let offsetX = 0;
  let offsetY = 0;

  function onDragStart(e: React.DragEvent) {
    const rect = ref.current?.getBoundingClientRect();
    offsetX = e.clientX - (rect?.left || 0);
    offsetY = e.clientY - (rect?.top || 0);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragEnd(e: React.DragEvent) {
    if (onMove) {
      onMove(id, e.clientX - offsetX, e.clientY - offsetY);
    }
  }

  return (
    <div
      ref={ref}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ cursor: "grab", ...style }}
      className="active:cursor-grabbing"
    >
      {children}
    </div>
  );
};
