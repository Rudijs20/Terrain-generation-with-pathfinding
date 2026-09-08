# Tabletop Pathfinder

## Overview
A randomised terrain generator and A* pathfinding visualiser mapped onto a 3D tabletop design. Originally made to be represented on a spherical globe, however, the project was changed to a tabletop board design. This change improved the visual appearance of the generated terrain by eliminating the distortion created by using a 2D map wrapped around a 3D globe.

## Core Features
The user interface allows for real-time manipulation of the world size, sea level, and mountain intensity. Once generated, the user can interact with the world in two ways:
* **Mode 1 (Tech Demo)**: A simple visualiser for the A* algorithm. The user clicks to place the Bear and the Bunny. The backend calculates the most energy-efficient route, and the Bear physically traverses the 3D terrain.
* **Mode 2 (Play Game)**: The user clicks the start point of the bear, then the start point of the rabbit. Then the user clicks further to change the rabbit's next position to reach while the bear tries to chase it. The rabbit moves slightly faster than the bear. 

## Architecture
### Terrain Generation (generator.py)
Originally made using randomly placed peak spots with a gradual drop-off in height, after which water would be placed in the valleys. This was changed to use the perlin-noise library with random seed generation for a much more naturally-looking map generation.
* **Noise Octaves**: The terrain combines three distinct layers of Perlin noise (Macro, Micro, and Jagged) to create organic continents with highly detailed, sharp crags.
* **Dynamic Power Curve**: The mountain aggression slider adjusts the exponent applied to the noise. A higher aggression applies a sharper power curve, flattening valleys while shooting peaks upwards.
* **Relative Elevation**: To prevent unnatural cliffs at the shoreline, the generator calculates absolute elevation and subtracts the user-defined sea level. This ensures beaches are perfectly level at zero, and mountains scale up naturally from the water. The terrain is categorised into Water, Land, Mountains, and Snow based on these relative heights.

### A* Pathfinding (pathfinder.py)
The Bear moves based on a priority-queue-based A* algorithm made to evaluate both terrain type and elevation for its energy costs and not just distance.
* **Octile Heuristics**: Octile distance heuristics are used for accurate grid estimations. Straight steps cost only 1.0 while diagonal steps cost 1.414 (the square root of 2).
* **Elevation Penalty**: Moving uphill is made to be mathematically exhausting. If a target position is higher than the current position, the algorithm applies an exponential steepness penalty: $Cost = Base + (Steepness^2 \times 0.1)$
* The algorithm will naturally want to walk around steep mountains rather than climbing over them, unless the detour is significantly longer. Additionally, water is not traversable at all.

### Rendering Engine (main.js)
The frontend uses Three.js to translate 2D arrays into a 3D physical world.
* **Elevation Creation**: First a flat PlaneGeometry is divided to match the provided grid size. Then the vertices are looped through and extrusions are made on the Z-axis based on the provided elevation data from the backend.
* The actors are not external files but built at runtime using grouped primitive sphere and cone shapes.


## Setup Instructions
1. **Backend Setup**
    Go to the backend folder and activate the virtual python environment. Install the required libraries and start the Flask server:

        pip install -r requirements.txt
        python app.py

    *(Ensure Flask, flask-cors, and perlin-noise are successfully installed)*

2. **Frontend Setup**
    Because Three.js is imported as an ES module, it must be run on a local web server to avoid CORS policy errors. Navigate to the frontend folder and run:

        python -m http.server 8000

    Open the browser and go to http://localhost:8000. Now the sliders can be set and the worlds generated.


## Improvements and Remarks
What could have been improved are the visual aspects of the map. I would have liked to make it look more detailed with custom textures for the animal models and the ground, as well as adding different terrain types.

While completing this project, I encountered issues with how the initial globe version looked. I wasn't happy with the visual distortion, which led to the decision to restructure the project into a 2D flat tabletop map. This pivot added extra development time, meaning the final 2D version doesn't have quite as many visual or gameplay features as I originally envisioned. However, despite the shift in scope, the core A* pathfinder works nicely and efficiently and the terrain generation looks nicely natural.