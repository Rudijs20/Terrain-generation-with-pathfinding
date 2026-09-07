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
    """
    Finds the cheapest path using gradient (steepness) pathfinding.
    """
    height = len(grid)
    width = len(grid[0])
    
    # Dont let the user start or end in the ocean
    if grid[start_y][start_x]["type"] == "water" or grid[end_y][end_x]["type"] == "water":
        return {"error": "Cannot start or end on water", "path": []}

    # Queue that stores priority, x, y. heapq keeps the lowest priority at the front.
    queue = []
    heapq.heappush(queue, (0, start_x, start_y))
    
    cost_so_far = {(start_x, start_y): 0}
    
    # saves last move so a line can be drawn
    came_from = {(start_x, start_y): None}

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

        # Now evaluate the neighbors
        for nx, ny, is_diagonal in neighbors:
            target_cell = grid[ny][nx]
            
            if target_cell["type"] == "water":
                continue
                
            step_cost = 1.414 if is_diagonal else 1.0
            
            current_elevation = grid[current_y][current_x]["elevation"]
            next_elevation = target_cell["elevation"]
            
            # Going up a increasing elevation adds a penalty 
            # (small bumps are fine but going over a full hill adds an increasingly bigger pentaly)
            if next_elevation > current_elevation:
                steepness = next_elevation - current_elevation
                step_cost += (steepness * steepness) * 0.1
                
            # total energy spent so far
            new_cost = cost_so_far[(current_x, current_y)] + step_cost
            
            # If A* finds a cheaper path later that say goes around the mountain not over it with much less energy used
            # it will rewrite history by replacing old markers with new cheaper ones
            if (nx, ny) not in cost_so_far or new_cost < cost_so_far[(nx, ny)]:
                cost_so_far[(nx, ny)] = new_cost
                
                # Priority = actual cost so far + heuristic guess to the end
                priority = new_cost + heuristic(nx, ny, end_x, end_y, width)
                heapq.heappush(queue, (priority, nx, ny))
                
                # Leave a markers pointing backward
                came_from[(nx, ny)] = (current_x, current_y)
                

    # If the end point is not found in our marker tail the path was not found
    # (clicked on a island with no land connections for example)
    if (end_x, end_y) not in came_from:
        return {"error": "No valid path found (blocked by water or impossible cliffs)", "path": []}
        
    path = []
    current = (end_x, end_y)
    
    # Follow the arrows backward till it gets to the start
    while current is not None:
        path.append([current[0], current[1]])
        current = came_from[current]
        
    path.reverse()
    
    return {"path": path, "total_cost": round(cost_so_far[(end_x, end_y)], 2)}

# --- TESTING BLOCK ---
if __name__ == "__main__":
    from generator import generate_terrain
    
    print("Generating map...")
    test_grid = generate_terrain(width=30, height=15, num_peaks=3, num_lakes=1)
    
    # Find a safe land tile to start on
    start_point = None
    end_point = None
    
    for y in range(15):
        for x in range(30):
            if test_grid[y][x]["type"] != "water":
                if not start_point:
                    start_point = (x, y)
                else:
                    end_point = (x, y) # Just grabs the last available land tile
                    
    print(f"Finding path from {start_point} to {end_point}...")
    result = find_path(test_grid, start_point[0], start_point[1], end_point[0], end_point[1])
    
    if "error" in result:
        print(result["error"])
    else:
        print(f"Success! Path found with {len(result['path'])} steps.")
        print(f"Total energy cost: {result['total_cost']}")