"use client";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable
} from "@dnd-kit/sortable";
import TicketDashboardWidgets from "./widgets";
import PayrollSummary from "./payroll-summary";

function WidgetContainer({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translateY(${transform.y}px)` : undefined,
        transition,
        opacity: isDragging ? 0.7 : 1
      }}
      {...attributes}
      {...listeners}
      className="mb-6"
    >
      {children}
    </div>
  );
}

export default function DnDTicketDashboard() {
  const [widgets, setWidgets] = useState([
    { id: "stats", component: <TicketDashboardWidgets /> },
    { id: "payroll", component: <PayrollSummary /> }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Ticket Dashboard (Drag & Drop)</h1>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (active.id !== over?.id) {
            setWidgets((items) => {
              const oldIndex = items.findIndex(w => w.id === active.id);
              const newIndex = items.findIndex(w => w.id === over.id);
              return arrayMove(items, oldIndex, newIndex);
            });
          }
        }}
      >
        <SortableContext items={widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
          {widgets.map(w => (
            <WidgetContainer key={w.id} id={w.id}>{w.component}</WidgetContainer>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
