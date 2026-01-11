"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "./dnd-exports";

interface Load {
  id: string;
  status: string;
  driver?: string;
  route?: string;
}

const initialLoads: Load[] = [
  { id: "L-1001", status: "pending" },
  { id: "L-1002", status: "assigned", driver: "John D." },
  { id: "L-1003", status: "in_transit", driver: "Jane S.", route: "A-B" },
];


const statusColumns = [
  { key: "pending", label: "Pending" },
  { key: "assigned", label: "Assigned" },
  { key: "in_transit", label: "In Transit" },
];

export default function DispatchBoard() {
  const [loads, setLoads] = useState(initialLoads);

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    // Only allow moving between columns
    const sourceStatus = statusColumns[source.droppableId].key;
    const destStatus = statusColumns[destination.droppableId].key;
    if (sourceStatus === destStatus) return;
    setLoads(prev =>
      prev.map(l =>
        l.id === draggableId ? { ...l, status: destStatus } : l
      )
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dispatch Board</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-3 gap-6">
          {statusColumns.map((col, colIdx) => (
            <div key={col.key}>
              <h2 className="font-semibold mb-2">{col.label}</h2>
              <Droppable droppableId={String(colIdx)}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 min-h-[60px]"
                  >
                    {loads.filter(l => l.status === col.key).map((l, idx) => (
                      <Draggable key={l.id} draggableId={l.id} index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={
                              "bg-white rounded shadow p-2 " +
                              (snapshot.isDragging ? "ring-2 ring-blue-400" : "")
                            }
                          >
                            {l.id}
                            {col.key === "assigned" && (
                              <span className="text-xs text-gray-500"> ({l.driver})</span>
                            )}
                            {col.key === "in_transit" && (
                              <span className="text-xs text-gray-500"> ({l.driver}, {l.route})</span>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4">
        <strong>AI Matching & Route Optimization:</strong> Coming soon. Loads will be auto-matched to drivers and routes using AI.
      </div>
    </div>
  );
}
