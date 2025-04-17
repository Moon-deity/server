const express = require('express');
const app = express();
const port = 5000;

// Define a fixed road path (a series of coordinates representing a road)
const roadPath = [
    [77.1, 28.5], [77.12, 28.51], [77.14, 28.52], [77.16, 28.53],
    [77.18, 28.54], [77.2, 28.55], [77.22, 28.56], [77.24, 28.57],
    [77.26, 28.58], [77.28, 28.59], [77.3, 28.6], [77.32, 28.61],
    [77.34, 28.62], [77.36, 28.63], [77.38, 28.64], [77.4, 28.65]
];

// Bus state
let busPosition = 0; // Index in the roadPath
let busDirection = 1; // 1 for forward, -1 for backward
const busSpeed = 0.001; // How much to increment position each update - reduced for realistic movement

// Area state - base polygon with small variations
const baseArea = [
    [77.2, 28.53], [77.25, 28.54], [77.3, 28.55], [77.32, 28.53],
    [77.3, 28.51], [77.25, 28.5], [77.2, 28.53]
];

// Maximum variation for each coordinate
const maxVariation = 0.05;
let areaVariationSeed = 0;

// Function to get current area with subtle variations
function getCurrentArea() {
    // Increase seed slightly for smooth changes
    areaVariationSeed += 0.01;

    // Create a new array with slight variations
    return baseArea.map(point => {
        // Use sine functions with different frequencies for natural-looking variation
        const xVariation = Math.sin(areaVariationSeed * 0.1 + point[0] * 10) * maxVariation;
        const yVariation = Math.cos(areaVariationSeed * 0.2 + point[1] * 10) * maxVariation;

        return [
            point[0] + xVariation,
            point[1] + yVariation
        ];
    });
}

// Function to generate area GeoJSON data
function generateAreaGeoJSON() {
    const currentArea = getCurrentArea();

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "Changing Area",
                    "description": "An area that changes slightly over time",
                    "timestamp": new Date().toISOString()
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [currentArea]
                }
            }
        ]
    };
}

// Function to get current bus location (interpolated between road points)
function getCurrentBusLocation() {
    // Make sure busPosition is within valid range
    if (busPosition < 0) busPosition = 0;
    if (busPosition >= roadPath.length - 1) busPosition = roadPath.length - 1.01;

    const currentIndex = Math.floor(busPosition);
    const nextIndex = Math.min(currentIndex + 1, roadPath.length - 1);
    const fraction = busPosition - currentIndex;

    // Interpolate between current and next point
    const current = roadPath[currentIndex];
    const next = roadPath[nextIndex];

    return [
        current[0] + (next[0] - current[0]) * fraction,
        current[1] + (next[1] - current[1]) * fraction
    ];
}

// Function to generate bus GeoJSON data
function generateBusGeoJSON() {
    const busLocation = getCurrentBusLocation();

    // Get previous and next positions to determine direction
    const currentIndex = Math.floor(busPosition);
    const nextIndex = (currentIndex + 1) % roadPath.length;
    const prevIndex = (currentIndex - 1 + roadPath.length) % roadPath.length;

    // Get bearing (simplified)
    const direction = busDirection === 1 ?
        [roadPath[nextIndex][0] - roadPath[currentIndex][0], roadPath[nextIndex][1] - roadPath[currentIndex][1]] :
        [roadPath[currentIndex][0] - roadPath[prevIndex][0], roadPath[currentIndex][1] - roadPath[prevIndex][1]];

    // Normalize direction vector
    const magnitude = Math.sqrt(direction[0] * direction[0] + direction[1] * direction[1]);
    const normalizedDirection = [direction[0] / magnitude, direction[1] / magnitude];

    return {
        "type": "FeatureCollection",
        "features": [
            // The road
            {
                "type": "Feature",
                "properties": {
                    "name": "Road",
                    "description": "The road path"
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": roadPath
                }
            },
            // The bus
            {
                "type": "Feature",
                "properties": {
                    "name": "Bus",
                    "description": "Moving bus",
                    "timestamp": new Date().toISOString()
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": busLocation
                }
            },
            // Direction indicator (a small line showing bus direction)
            {
                "type": "Feature",
                "properties": {
                    "name": "Direction",
                    "description": "Bus direction"
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        busLocation,
                        [busLocation[0] + normalizedDirection[0] * 0.01, busLocation[1] + normalizedDirection[1] * 0.01]
                    ]
                }
            }
        ]
    };
}

// Update bus position
function updateBusPosition() {
    busPosition += busSpeed * busDirection;

    // Reverse direction at endpoints with safety bounds
    if (busPosition >= roadPath.length - 1.1) {
        busPosition = roadPath.length - 1.1;
        busDirection = -1;
    } else if (busPosition <= 0.1) {
        busPosition = 0.1;
        busDirection = 1;
    }
}

// Variables to hold current GeoJSON data
let currentBusGeoJSON = generateBusGeoJSON();
let currentAreaGeoJSON = generateAreaGeoJSON();

// Update data every 10 milliseconds
setInterval(() => {
    updateBusPosition();
    currentBusGeoJSON = generateBusGeoJSON();

    // Update area less frequently - only every 30 iterations (300ms)
    if (Math.random() < 0.3) { // ~30% chance of updating each time
        currentAreaGeoJSON = generateAreaGeoJSON();
    }
}, 10);

// Routes
app.get('/api/bus', (req, res) => {
    res.json(currentBusGeoJSON);
});

app.get('/api/area', (req, res) => {
    res.json(currentAreaGeoJSON);
});

// For backward compatibility
app.get('/api', (req, res) => {
    res.json(currentBusGeoJSON);
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Bus API: http://localhost:${port}/api/bus`);
    console.log(`Area API: http://localhost:${port}/api/area`);
}); 