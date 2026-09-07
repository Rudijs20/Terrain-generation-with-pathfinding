from flask import Flask, jsonify, request
from flask_cors import CORS
from generator import generate_terrain

app = Flask(__name__)

# Enable CORS (Cross-Origin Resource Sharing)
CORS(app)

# create the API Endpoint
@app.route('/api/map', methods=['GET'])
def get_map():

    width = int(request.args.get('width', 64))
    height = int(request.args.get('height', 32))
    peaks = int(request.args.get('peaks', 20))
    lakes = int(request.args.get('lakes', 5))
    
    terrain_grid = generate_terrain(width=width, height=height, num_peaks=peaks, num_lakes=lakes)

    # what is sent to the front end
    return jsonify({
        "width": width,
        "height": height,
        "grid": terrain_grid
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)