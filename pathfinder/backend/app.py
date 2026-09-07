from flask import Flask, jsonify, request
from flask_cors import CORS
from generator import generate_terrain
from pathfinder import find_path

app = Flask(__name__)
CORS(app)

#  A global variable to store the map in the servers memory
current_grid = None

@app.route('/api/map', methods=['GET'])
def get_map():
    """
    Generates the map, SAVES it to memory, and sends it to the frontend.
    """
    global current_grid
    
    width = int(request.args.get('width', 128))
    height = int(request.args.get('height', 64))
    peaks = int(request.args.get('peaks', 20))
    lakes = int(request.args.get('lakes', 10))
    
    current_grid = generate_terrain(width=width, height=height, num_peaks=peaks, num_lakes=lakes)
    
    return jsonify({
        "width": width,
        "height": height,
        "grid": current_grid
    })

@app.route('/api/path', methods=['POST'])
def get_path():
    """
    Receives start/end coordinates from the frontend, uses the saved map, 
    and returns the optimal path.
    """
    global current_grid
    
    if current_grid is None:
        return jsonify({"error": "No map generated yet! Please load the map first."}), 400
        
    # data from frontend
    data = request.json
    start_x = data.get('start_x')
    start_y = data.get('start_y')
    end_x = data.get('end_x')
    end_y = data.get('end_y')
    
    if None in [start_x, start_y, end_x, end_y]:
        return jsonify({"error": "Missing coordinates in request."}), 400
        
    result = find_path(current_grid, start_x, start_y, end_x, end_y)
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)