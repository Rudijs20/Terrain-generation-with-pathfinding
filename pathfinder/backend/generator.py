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

        return elevation_map, peaks


if __name__ == "__main__":
    # We unpack the two things returned by our function
    test_grid, peak_list = generate_terrain()
    
    print(f"Generated {len(peak_list)} peaks:")
    for p in peak_list:
        print(f" - Peak at (x:{p[0]}, y:{p[1]}) with height {p[2]:.1f}")
        
    print("\nThe Grid:")
    for row in test_grid:
        print(row)