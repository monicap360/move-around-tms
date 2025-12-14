// Utility to import all Texas and Louisiana pits/plants and aggregates into the system

import pitsPlants from '../../seed-pits-plants.json';
import aggregates from './seed-aggregates.json';

export async function importSeeds(apiBase: string, org: string) {
  // Import plants/pits
  for (const plant of pitsPlants) {
    await fetch(`${apiBase}/company/${org}/plants/api/create-plant`, {
      method: 'POST',
      body: JSON.stringify(plant),
    });
  }
  // Import aggregates for each plant (simulate for all)
  for (const plant of pitsPlants) {
    for (const material of aggregates) {
      await fetch(`${apiBase}/company/${org}/plants/${plant.id}/materials/api/create-material`, {
        method: 'POST',
        body: JSON.stringify(material),
      });
    }
  }
}
