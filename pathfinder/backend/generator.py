import random
import math
from perlin_noise import PerlinNoise

def generate_terrain(width=128, height=128, num_peaks=50, num_lakes=20):
    seed = random.randint(1, 10000)
    
    noise_macro = PerlinNoise(octaves=3, seed=seed)
    noise_micro = PerlinNoise(octaves=6, seed=seed + 1)
    noise_jagged = PerlinNoise(octaves=12, seed=seed + 2)
    
    terrain_grid = [[None for _ in range(width)] for _ in range(height)]
    noise_scale = 85.0 
    
    sea_level = float(num_lakes) # Slider from 0 to 80
    peak_intensity = float(num_peaks) # Slider from 0 to 100
    
    # Dynamic Height and Sharpness: as peaks go up, the power curve gets sharper (1.0 to 2.0) 
    # and the max height multiplies (80 to 230)
    power = 1.0 + (peak_intensity / 100.0) 
    multiplier = 80.0 + (peak_intensity * 1.5)

    for y in range(height):
        for x in range(width):
            nx, ny = x / noise_scale, y / noise_scale
            
            val = noise_macro([nx, ny])
            val += 0.5 * noise_micro([nx, ny])
            val += 0.25 * noise_jagged([nx, ny])
            
            norm = (val + 0.8) / 1.6
            norm = max(0.0, min(1.0, norm))
            
            absolute_elevation = math.pow(norm, power) * multiplier
            
            if absolute_elevation < sea_level:
                terrain_grid[y][x] = {"type": "water", "cost": -1, "elevation": 0.0}
            else:
                # Relative height allows for mountains to naturally grow out of the shoreline
                relative_height = absolute_elevation - sea_level
                
                if relative_height < 30:
                    terrain_grid[y][x] = {"type": "land", "cost": 1, "elevation": round(relative_height, 1)}
                elif relative_height < 65:
                    terrain_grid[y][x] = {"type": "mountain", "cost": 5, "elevation": round(relative_height, 1)}
                else:
                    terrain_grid[y][x] = {"type": "snow", "cost": 10, "elevation": round(relative_height, 1)}
                
    return terrain_grid