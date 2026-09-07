import heapq

# This calculates the diagonal (Octile) distance betwee two points (inlcuding globe shortcut)
def heuristic(x1, y1, x2, y2, width):

    dx = abs(x1 - x2)
    if dx > (width / 2):
        dx = width - dx
    dy = abs(y1 - y2)
    

    # A straight step costs 1. A diagonal step costs 1.414 (square root of 2)
    min_dist = min(dx, dy)
    max_dist = max(dx, dy)
    
    return (max_dist - min_dist) + (1.414 * min_dist)

# Finds the cheapest path using gradient (steepness) pathfinding
def find_path(grid, start_x, start_y, end_x, end_y):
    height = len(grid)
    width = len(grid[0])
    
    # Dont let the user start or end in the ocean
    if grid[start_y][start_x]["type"] == "water" or grid[end_y][end_x]["type"] == "water":
        return {"error": "Cannot start or end on water", "path": []}

    queue = []
    heapq.heappush(queue, (0, start_x, start_y))

    while queue:
        _, current_x, current_y = heapq.heappop(queue)
        
        # check if we reached the goal
        if current_x == end_x and current_y == end_y:
            break
            
        # Gets all 8 neighbors
        neighbors = []
        for y_offset in [-1, 0, 1]:
            for x_offset in [-1, 0, 1]:
                if x_offset == 0 and y_offset == 0:
                    continue
                    
                ny = current_y + y_offset
                # wraps around the globe with modulo
                nx = (current_x + x_offset) % width
                
                # boudry check
                if 0 <= ny < height:
                    is_diagonal = (x_offset != 0 and y_offset != 0)
                    neighbors.append((nx, ny, is_diagonal))

        return {"test_neighbors": neighbors}

# Test the neighbor gathering (starting at x=5, y=5)
if __name__ == "__main__":
    from generator import generate_terrain
    
    test_grid = generate_terrain(width=10, height=10, num_peaks=1, num_lakes=0)

    test_result = find_path(test_grid, 5, 5, 8, 8)
    print("Found neighbors for cell (5,5):")
    for n in test_result.get("test_neighbors", []):
        print(f" - X:{n[0]}, Y:{n[1]}, Diagonal:{n[2]}")