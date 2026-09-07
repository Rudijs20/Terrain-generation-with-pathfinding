import random
import math

def generate_terrain(width=64, height=32, num_peaks=20, num_lakes=5, num_rivers=4):
            
    elevation_map = [[0.0 for _ in range(width)] for _ in range(height)]

    peaks = []
    for _ in range(num_peaks):
        px = random.randint(0, width - 1)
        py = random.randint(0, height - 1)

        # Gives peak random weight (height)
        intensity = random.uniform(50, 150)

        peaks.append((px, py, intensity))

        elevation_map[py][px] = round(intensity, 1) # temporary

    max_elevation = 0.0

    # loop though every cell and checks its distance to every peak
    for y in range(height):
            for x in range(width):
                cell_elevation = 0.0
                
                # distance to peak
                for px, py, intensity in peaks:
                    
                    dx = abs(x - px)
                    
                    # Globe wrap around trick: 
                    # If the distance across the map is further
                    # than going off the edge take the short cut
                    if dx > (width / 2):
                        dx = width - dx
                        
                    dy = abs(y - py)
                    
                    distance = math.sqrt(dx * dx + dy * dy)
                    
                    # The further the point for a peak less elevation is given
                    # + 1.0 so it doens't divde by 0 on the peak
                    cell_elevation += intensity / (1.0 + distance)
                
                elevation_map[y][x] = round(cell_elevation, 1)
                
                max_elevation = max(max_elevation, cell_elevation)
                    

    # First generate only land, mountains and snow
    terrain_grid = [[None for _ in range(width)] for _ in range(height)]
    for y in range(height):
        for x in range(width):
            normalized = (elevation_map[y][x] / max_elevation) * 100
            
            if normalized < 65:
                terrain_grid[y][x] = {"type": "land", "cost": 1, "elevation": round(normalized, 1)}
            elif normalized < 90:
                terrain_grid[y][x] = {"type": "mountain", "cost": 5, "elevation": round(normalized, 1)}
            else:
                terrain_grid[y][x] = {"type": "snow", "cost": 10, "elevation": round(normalized, 1)}

    # Add lakes (They are added farther away from mountains more in lowlands)
    max_lake_radius = max(1.5, min(width, height) * 0.08)  # adjusts lake size based on map size

    for _ in range(num_lakes):
        valid_spot = False
        attempts = 0
        
        while not valid_spot and attempts < 100:
            lx = random.randint(0, width - 1)
            ly = random.randint(0, height - 1)
            
            # Check the weight (height) of this spot
            normalized = (elevation_map[ly][lx] / max_elevation) * 100
            
            # This makes the lakes be added only on location bellow 50 height
            if terrain_grid[ly][lx]["type"] == "land" and normalized < 50:
                valid_spot = True
                
            attempts += 1
            
        if valid_spot:
            radius = random.uniform(1.0, max_lake_radius)
            for y in range(height):
                for x in range(width):
                    dx = abs(x - lx)
                    if dx > (width / 2): dx = width - dx
                    dy = abs(y - ly)
                    
                    if math.sqrt(dx*dx + dy*dy) <= radius:
                        # Double check that only land is overwritten
                        if terrain_grid[y][x]["type"] == "land":
                            terrain_grid[y][x] = {"type": "water", "cost": -1, "elevation": round(normalized, 1)}                                            
    return terrain_grid
                
# print a ASCII make to visualise the look
if __name__ == "__main__":
    test_width = 40
    test_height = 15
    final_map = generate_terrain(width=test_width, height=test_height, num_peaks=8)
    
    # ~ = Water, . = Land, ^ = Mountain, * = Snow
    for row in final_map:
        row_string = ""
        for cell in row:
            if cell["type"] == "water":
                row_string += "~~"
            elif cell["type"] == "land":
                row_string += ".."
            elif cell["type"] == "mountain":
                row_string += "^^"
            elif cell["type"] == "snow":
                row_string += "**"
        print(row_string)
    print("\n")