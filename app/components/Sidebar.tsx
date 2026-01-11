
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useState } from "react";

export default function Sidebar() {
  // Main Sidebar Sections (now stateful for drag-drop)
  const [intelligenceCore, setIntelligenceCore] = useState([
    { name: "Central Intelligence System", path: "/intelligence" },
    { name: "Ticket Forensics", path: "/intelligence/ticket-forensics" },
    { name: "Payroll Intelligence", path: "/intelligence/payroll" },
    { name: "Vendor & Contract AI", path: "/intelligence/vendor-contract" },
    { name: "Excel Reality Check", path: "/intelligence/excel-check" },
    { name: "Data Reconciliation", path: "/intelligence/reconciliation" },
  ]);
  const [fleetPulse, setFleetPulse] = useState([
    { name: "Operations Intelligence Unit", path: "/operations/intel" },
    { name: "Live Situational Awareness", path: "/operations/live" },
    { name: "Daily Driver Reconstruction", path: "/operations/driver-recon" },
    { name: "Idle & Delay Analysis", path: "/operations/idle-delay" },
    { name: "Yard Movement", path: "/operations/yard" },
    { name: "Performance Scores", path: "/operations/performance" },
    { name: "Weekly Ops Heatmap", path: "/operations/heatmap" },
  ]);

  function handleDragEnd(result: any, section: "intelligence" | "fleet") {
    if (!result.destination) return;
    const items = section === "intelligence" ? Array.from(intelligenceCore) : Array.from(fleetPulse);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    if (section === "intelligence") setIntelligenceCore(items);
    else setFleetPulse(items);
  }
  const items = [
    { name: "Dashboard", path: "/" },
    { name: "Tickets", path: "/tickets" },
    { name: "Aggregates", path: "/aggregates" },
    { name: "Drivers", path: "/drivers" },
    { name: "Materials", path: "/materials" },
    { name: "Plants", path: "/plants" },
    { name: "Jobsites", path: "/jobsites" },
    { name: "Loads", path: "/loads" },
    { name: "Dispatch", path: "/dispatch" },
    { name: "Payroll", path: "/payroll" },
    { name: "HR", path: "/hr" },
    { name: "IFTA", path: "/ifta" },
    { name: "Maintenance", path: "/maintenance" },
    { name: "Billing", path: "/billing" },
    { name: "Reports", path: "/reports" },
    { name: "Admin", path: "/admin" },
  ];
  // Horizontal shortcuts (top bar)
  const shortcuts = [
    { name: "Tickets", path: "/tickets" },
    { name: "Aggregates", path: "/aggregates" },
    { name: "Drivers", path: "/drivers" },
    { name: "Dispatch", path: "/dispatch" },
    { name: "Reports", path: "/reports" },
  ];

  return (
    <>
      {/* Horizontal Shortcuts Bar */}
      <div className="w-full flex space-x-2 bg-[#1E90FF] text-white p-2 fixed top-0 left-0 z-50 shadow-lg">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.path}
            href={shortcut.path}
            className="px-3 py-1 rounded hover:bg-[#0A1C2E] font-semibold"
          >
            {shortcut.name}
          </Link>
        ))}
      </div>
      {/* Sidebar */}
      <aside className="w-60 bg-[#0A1C2E] text-white h-screen p-4 space-y-4 fixed left-0 top-12 overflow-y-auto">
        <h1 className="text-xl font-bold mb-4">MoveAround Intelligence Core™</h1>
        <DragDropContext onDragEnd={result => handleDragEnd(result, "intelligence")}> 
          <Droppable droppableId="intelligenceCore">
            {(provided) => (
              <div className="mb-2" ref={provided.innerRef} {...provided.droppableProps}>
                {intelligenceCore.map((item, idx) => (
                  <Draggable key={item.path} draggableId={item.path} index={idx}>
                    {(provided, snapshot) => (
                      <Link
                        href={item.path}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`block px-3 py-2 rounded transition-all duration-200 hover:bg-[#1E90FF] ${snapshot.isDragging ? 'bg-cyan-700 scale-105 shadow-lg' : ''}`}
                      >
                        {item.name}
                      </Link>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <h1 className="text-xl font-bold mb-4">FleetPulse AI™</h1>
        <DragDropContext onDragEnd={result => handleDragEnd(result, "fleet")}> 
          <Droppable droppableId="fleetPulse">
            {(provided) => (
              <div className="mb-2" ref={provided.innerRef} {...provided.droppableProps}>
                {fleetPulse.map((item, idx) => (
                  <Draggable key={item.path} draggableId={item.path} index={idx}>
                    {(provided, snapshot) => (
                      <Link
                        href={item.path}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`block px-3 py-2 rounded transition-all duration-200 hover:bg-[#1E90FF] ${snapshot.isDragging ? 'bg-cyan-700 scale-105 shadow-lg' : ''}`}
                      >
                        {item.name}
                      </Link>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <h1 className="text-xl font-bold mb-4">Operations</h1>
        {items.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className="block px-3 py-2 rounded hover:bg-[#1E90FF]"
          >
            {item.name}
          </Link>
        ))}
      </aside>
    </>
  );
}
