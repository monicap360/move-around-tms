// MoveAround TMS Load Board JS
// Connects to Supabase and powers loads.html
import { supabase } from './supabase.js';

// DOM elements
const loadListBody = document.getElementById('loadListBody');
const kanbanColumns = {
  created: document.getElementById('kanban-created'),
  assigned: document.getElementById('kanban-assigned'),
  dispatched: document.getElementById('kanban-dispatched'),
  in_transit: document.getElementById('kanban-in_transit'),
  delivered: document.getElementById('kanban-delivered'),
  invoiced: document.getElementById('kanban-invoiced'),
};
const listViewBtn = document.getElementById('listViewBtn');
const kanbanViewBtn = document.getElementById('kanbanViewBtn');
const listView = document.getElementById('listView');
const kanbanView = document.getElementById('kanbanView');

// View toggle
listViewBtn.onclick = () => {
  listView.classList.remove('hidden');
  kanbanView.classList.add('hidden');
  listViewBtn.classList.add('active');
  kanbanViewBtn.classList.remove('active');
};
kanbanViewBtn.onclick = () => {
  listView.classList.add('hidden');
  kanbanView.classList.remove('hidden');
  listViewBtn.classList.remove('active');
  kanbanViewBtn.classList.add('active');
};

// Fetch and render loads
async function fetchLoads() {
  const { data: loads, error } = await supabase
    .from('loads')
    .select('*, customer:customers(name), assignments:load_assignments(*, driver:drivers(name), truck:vehicles(truck_number))')
    .order('updated_at', { ascending: false });
  if (error) {
    alert('Error loading loads');
    return;
  }
  renderListView(loads);
  renderKanbanView(loads);
}

function renderListView(loads) {
  loadListBody.innerHTML = '';
  loads.forEach(load => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${load.load_number}</td>
      <td>${load.customer?.name || ''}</td>
      <td>${getStopsSummary(load.id)}</td>
      <td>${getAssignmentSummary(load.assignments)}</td>
      <td>${getTruckSummary(load.assignments)}</td>
      <td>${load.status}</td>
      <td>${new Date(load.updated_at).toLocaleString()}</td>
      <td><button class="btn" onclick="openLoadDetail('${load.id}')">View</button></td>
    `;
    loadListBody.appendChild(row);
  });
}

function renderKanbanView(loads) {
  Object.values(kanbanColumns).forEach(col => col.innerHTML = '');
  loads.forEach(load => {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.innerHTML = `
      <b>${load.load_number}</b><br>
      ${load.customer?.name || ''}<br>
      ${getStopsSummary(load.id)}<br>
      Driver: ${getAssignmentSummary(load.assignments)}<br>
      Truck: ${getTruckSummary(load.assignments)}<br>
      <span class="status">${load.status}</span>
      <button class="btn" onclick="openLoadDetail('${load.id}')">Details</button>
    `;
    if (kanbanColumns[load.status]) kanbanColumns[load.status].appendChild(card);
  });
}

// Helpers (stubbed for now)
function getStopsSummary(loadId) {
  // TODO: Fetch stops for loadId and return summary string
  return '';
}
function getAssignmentSummary(assignments) {
  // TODO: Return driver name from assignments
  if (!assignments || assignments.length === 0) return '';
  return assignments[0].driver?.name || '';
}
function getTruckSummary(assignments) {
  // TODO: Return truck number from assignments
  if (!assignments || assignments.length === 0) return '';
  return assignments[0].truck?.truck_number || '';
}

// Load detail drawer logic (stub)
window.openLoadDetail = function(loadId) {
  // TODO: Fetch load details, stops, assignments, documents
  // Populate drawer fields and show drawer
  alert('Open load detail for ' + loadId);
};

// Initial fetch
fetchLoads();
