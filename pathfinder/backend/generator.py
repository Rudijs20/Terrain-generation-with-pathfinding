import random
import math

def generate_terrain(width=64, height=32, num_peaks=20):
        
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
                    
    return elevation_map, max_elevation

# testing a smaller map to see if the peaks fall off actaully
if __name__ == "__main__":
    test_grid, highest_point = generate_terrain(width=15, height=8, num_peaks=3)
    
    print(f"Highest point on the map: {highest_point:.1f}\n")
    print("The Topographical Map:")
    for row in test_grid:
        formatted_row = ["{:>5}".format(val) for val in row]
        print(formatted_row)