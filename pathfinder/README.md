# Tabletop Pathfinder

## Overview
A randomised terrain generator and A* pathfinding visualiser mapped on to a 3D tabletop design. Originally made to be represented on a spherical globe, however the project was changed to a tabletop board design. This change improved the visual appearance of the generated terrain by eliminating the distortion created by using a 2D map wraped arounda 3D globe.

## Core Features
The user interface allows for real time manipulation of the world size, sea level, and mountain intensity. Once generated the user can interact with the world in two ways:
* Mode 1 (Tech Demo): A simple visualiser for the A* algorithm. The user clicks to place the Bear and the Bunny. The backend calculates the most energy-efficient route, and the Bear physically traverses the 3D terrain.
* Mode 2 (Play Game)

## Architecture:
### Terrain Generatin (generator.py)
Originaly made using randomly placed peak spots with gradual drop off in height after which water would be placed in the valeys but changed to use perlin-noise library with random seed generation for a lot more naturaly looking map generation.
* **Noise Octaves**: The terrain combines three distinct layers of Perlin noise (Macro, Micro, and Jagged) to create organic continents with highly detailed, sharp crags.
* **Dynamic Power Curver**: The mountain aggression slider adjusts the exponent applied to the noise. A higher aggression applies a sharper power curve, flattening valleys while shooting peaks upwards
* **Relative Elevation**: To prevent unnatural clifs at the shoreline, the generator calculates absolute elevation and subtracts the user-defined sea level. This ensures beaches are perfectly level at zero, and mountains scale up naturally from the water. The Terrain is categorised into Water, Land, Mountains, and Snow based on these relative heights.

### A* Pathfinding (pathfinder.py)
The Bear moves based on a priority queue based A* algorithm made to evaluate topolgical energy costs and not just distance
* **Octile Heuristics**: Octile distance heuristics are used for an accurate grid estimations. Streight steps cost only 1.0 whle diagonal steps cost 1.414 (The quare root of 2)
* **Elevatoin Penalty**: Moving uphill is made to be mathematically exhausting. If a target possition is higher than the current possition, the algorithm applies an exponential steepness penalty: $Cost = Base + (Steepness^2 \times 0.1)$
* The algorithm will naturally want to walk around steep mountains rather than climbing over them, unless the detour is significantly longer. As well as the water is not traversable at all.

### Renderin Engine (main.js)
The frontend uses Three.js to translate 2D arrays into a 3D physical world
* **Elevation Creation**: First a flat PalinGeometry is divided to match the provided grid size. Then the vertives are looped though and extrudions are made on the Z-axis based on the provided elevation data from the backend.
* The actors are not external files but built at runtime using grouped primitive sphere and cones shapes.


## Setup instuctions
1. Backend Setup
    Go to the backend folder and activate the virtual python environment. Install the required libraries nad start the Flast server:

        `pip install -r requirements.txt` \
        `python app.py`

(*Ensure Flask, flask-cors, adn perlin-noise are successfully installed*)

2. Frontend Setup
    Because Three.js is imported as an ES module, it must be run on a local web server to avoid CORS policy errors. Navigate to the frontend folder and run:

        `python -m http.server 8000`

    Open the browser and go to http://localhost:8000. Now the sliders can be set and the worlds generated.