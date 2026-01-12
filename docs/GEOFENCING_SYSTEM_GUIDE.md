# Geofencing & Geographic Boundary System

## Overview

The Geofencing System provides geographic boundary management, real-time vehicle tracking, entry/exit detection, and automated alerts for your TMS. It enables you to define virtual boundaries and monitor vehicle movements relative to these boundaries.

## Features

- **Multiple Geofence Types**: Circle, Polygon, and Rectangle boundaries
- **Real-time Detection**: Automatic entry/exit event detection
- **Violation Tracking**: Monitor unauthorized entries/exits
- **Automated Alerts**: Configure alerts and actions based on geofence events
- **Geographic Restrictions**: State/country-level restrictions and permit requirements
- **Vehicle Status Tracking**: Track which vehicles are inside which geofences

## Database Schema

Run the migration to create the required tables:

```bash
psql -d your_database -f db/migrations/041_geofencing_system.sql
```

### Tables Created

1. **geofences**: Stores geofence definitions
2. **geofence_events**: Logs all entry/exit events
3. **geographic_restrictions**: State/country-level restrictions
4. **vehicle_geofence_status**: Current status of vehicles relative to geofences

## Usage

### 1. Creating Geofences

#### Using the Component

```tsx
import GeofenceManager from '@/components/geofencing/GeofenceManager';

<GeofenceManager organizationId="your-org-id" />
```

#### Using the API

```bash
POST /api/geofencing/geofences
Content-Type: application/json

{
  "organizationId": "org-123",
  "name": "Houston Yard",
  "type": "circle",
  "coordinates": {
    "center": {
      "lat": 29.7604,
      "lng": -95.3698
    }
  },
  "radius": 500,
  "rules": {
    "alertOnEntry": true,
    "alertOnExit": true,
    "requirePermit": false
  },
  "active": true
}
```

### 2. Checking Vehicle Location Against Geofences

```bash
POST /api/geofencing/check
Content-Type: application/json

{
  "latitude": 29.7604,
  "longitude": -95.3698,
  "vehicleId": "vehicle-123",
  "driverId": "driver-456",
  "truckId": "truck-789",
  "organizationId": "org-123",
  "previousLatitude": 29.7500,
  "previousLongitude": -95.3600,
  "speed": 45,
  "heading": 90
}
```

Response:
```json
{
  "insideGeofences": [
    {
      "id": "geofence-123",
      "name": "Houston Yard",
      "type": "circle"
    }
  ],
  "events": [
    {
      "geofenceId": "geofence-123",
      "eventType": "entry",
      "timestamp": "2025-01-15T10:30:00Z",
      "metadata": {
        "geofenceName": "Houston Yard"
      }
    }
  ],
  "violations": []
}
```

### 3. Programmatic Usage

```typescript
import {
  isLocationInGeofence,
  detectGeofenceEvents,
  checkGeofenceViolations,
} from '@/lib/geofencing';

// Check if location is inside a geofence
const isInside = isLocationInGeofence(
  { lat: 29.7604, lng: -95.3698 },
  geofence
);

// Detect entry/exit events
const events = detectGeofenceEvents(
  currentLocation,
  previousLocation,
  geofences
);

// Check for violations
const violations = checkGeofenceViolations(location, geofences);
```

## Geofence Types

### Circle Geofence

```json
{
  "type": "circle",
  "coordinates": {
    "center": {
      "lat": 29.7604,
      "lng": -95.3698
    }
  },
  "radius": 1000
}
```

### Polygon Geofence

```json
{
  "type": "polygon",
  "coordinates": {
    "points": [
      { "lat": 29.7604, "lng": -95.3698 },
      { "lat": 29.7704, "lng": -95.3698 },
      { "lat": 29.7704, "lng": -95.3598 },
      { "lat": 29.7604, "lng": -95.3598 }
    ]
  }
}
```

### Rectangle Geofence

```json
{
  "type": "rectangle",
  "coordinates": {
    "bounds": {
      "north": 29.7704,
      "south": 29.7504,
      "east": -95.3598,
      "west": -95.3798
    }
  }
}
```

## Geofence Rules

Configure automated actions and restrictions:

```json
{
  "rules": {
    "alertOnEntry": true,
    "alertOnExit": true,
    "restrictEntry": false,
    "restrictExit": false,
    "requirePermit": false,
    "speedLimit": 55,
    "notifyUsers": ["user-1", "user-2"],
    "autoActions": [
      {
        "action": "log_event",
        "params": {}
      },
      {
        "action": "send_alert",
        "params": {
          "channel": "email",
          "recipients": ["admin@example.com"]
        }
      }
    ]
  }
}
```

## Integration with GPS Tracking

Integrate with your existing GPS tracking:

```typescript
// In your GPS ping handler
import { checkGeofences } from '@/lib/geofencing';

async function handleGPSPing(location: { lat: number; lng: number }) {
  // Check against geofences
  const response = await fetch('/api/geofencing/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: location.lat,
      longitude: location.lng,
      organizationId: orgId,
      vehicleId: vehicleId,
      // ... other fields
    }),
  });

  const { events, violations } = await response.json();

  // Handle events
  events.forEach((event) => {
    if (event.eventType === 'entry') {
      console.log(`Vehicle entered ${event.metadata.geofenceName}`);
      // Send notification, update status, etc.
    }
  });

  // Handle violations
  violations.forEach((violation) => {
    console.error(`Violation: ${violation.message}`);
    // Send alert, log violation, etc.
  });
}
```

## Event Types

- **entry**: Vehicle entered a geofence
- **exit**: Vehicle exited a geofence
- **inside**: Vehicle is currently inside a geofence
- **violation**: Vehicle violated a geofence restriction

## Best Practices

1. **Define Clear Boundaries**: Use appropriate geofence types for your use cases
2. **Set Up Alerts**: Configure alerts for critical geofences (yards, restricted areas)
3. **Monitor Events**: Regularly review geofence events for patterns
4. **Use Geographic Restrictions**: Set up state/country-level restrictions for compliance
5. **Optimize Performance**: Limit the number of active geofences checked per ping

## Use Cases

- **Yard Management**: Track when vehicles enter/exit yards
- **Restricted Areas**: Monitor unauthorized access to restricted zones
- **Route Compliance**: Ensure vehicles stay on approved routes
- **Delivery Zones**: Track deliveries within specific geographic areas
- **State Restrictions**: Enforce state-specific permit requirements
- **Speed Zones**: Apply speed limits based on geographic boundaries

## Troubleshooting

### Events not being detected
- Ensure geofences are marked as `active: true`
- Verify coordinates are correct (lat: -90 to 90, lng: -180 to 180)
- Check that previous location is being provided for entry/exit detection

### False positives
- Adjust geofence boundaries to account for GPS accuracy
- Consider using larger radius/boundaries for circle/rectangle types
- Review GPS ping frequency and accuracy

### Performance issues
- Limit geofence checks to active geofences only
- Use database indexes on frequently queried fields
- Consider caching geofence data for frequently accessed boundaries
