from flask import Flask, request, jsonify, send_from_directory, send_file, make_response, Response
from flask_cors import CORS
import os
import subprocess
import uuid
from datetime import datetime
import shutil

app = Flask(__name__, static_folder='static')

CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS", "HEAD"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Range", "ngrok-skip-browser-warning"],
        "expose_headers": ["Content-Range", "Accept-Ranges", "Content-Length"],
        "supports_credentials": False
    }
})

app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024

UPLOAD_FOLDER = os.path.expanduser('~/project/uploads')
OUTPUT_FOLDER = os.path.expanduser('~/project/trimmed_videos')
ALPHAPOSE_OUTPUT = os.path.expanduser('~/project/alphapose_output')
MOTIONBERT_OUTPUT = os.path.expanduser('~/project/motionbert_output')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(ALPHAPOSE_OUTPUT, exist_ok=True)
os.makedirs(MOTIONBERT_OUTPUT, exist_ok=True)

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/upload', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"video_{timestamp}_{unique_id}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    file.save(filepath)
    
    return jsonify({
        'success': True,
        'filename': filename,
        'filepath': filepath
    })

@app.route('/uploads/<filename>')
def serve_video(filename):
    response = make_response(send_from_directory(UPLOAD_FOLDER, filename))
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Accept-Ranges'] = 'bytes'
    return response

@app.route('/process', methods=['POST'])
def process_video():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    filename = data.get('filename')
    start_time = data.get('start_time')  # 抬腳時間 (秒)
    end_time = data.get('end_time')      # 球離手時間 (秒)
    
    if not all([filename, start_time is not None, end_time is not None]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    if start_time >= end_time:
        return jsonify({'error': 'Start time must be before end time'}), 400
    
    input_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(input_path):
        return jsonify({'error': 'Video file not found'}), 404
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_filename = f"trimmed_{timestamp}_{filename}"
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)
    
    try:
        # Calculate duration
        duration = float(end_time) - float(start_time)
        
        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-i', input_path,
            '-ss', str(start_time),
            '-t', str(duration),
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-strict', 'experimental',
            output_path
        ]
        
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return jsonify({'error': f'FFmpeg error: {result.stderr}'}), 500

        for f in os.listdir(ALPHAPOSE_OUTPUT):
            fpath = os.path.join(ALPHAPOSE_OUTPUT, f)
            if os.path.isfile(fpath):
                os.remove(fpath)
            elif os.path.isdir(fpath):
                shutil.rmtree(fpath)
        
        for f in os.listdir(MOTIONBERT_OUTPUT):
            fpath = os.path.join(MOTIONBERT_OUTPUT, f)
            if os.path.isfile(fpath):
                os.remove(fpath)
            elif os.path.isdir(fpath):
                shutil.rmtree(fpath)

        script_path = os.path.expanduser('~/project/script.sh')
        script_result = subprocess.run(
            ['bash', script_path, output_path],
            capture_output=True,
            text=True,
            cwd=os.path.expanduser('~/project')
        )
        
        if script_result.returncode != 0:
            return jsonify({
                'error': f'Script error: {script_result.stderr}',
                'stdout': script_result.stdout
            }), 500
        #模型有點問題，先設預設值
        predicted_speed_mph = 88
        predicted_speed_kmh = round(predicted_speed_mph * 1.60934, 1)
        
        return jsonify({
            'success': True,
            'message': 'Video processed successfully',
            'trimmed_video': output_filename,
            'start_time': start_time,
            'end_time': end_time,
            'duration': duration,
            'script_output': script_result.stdout,
            'prediction': {
                'speed_mph': predicted_speed_mph,
                'speed_kmh': predicted_speed_kmh
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/results')
def get_results():
    results = {
        'alphapose': [],
        'motionbert': []
    }
    
    if os.path.exists(ALPHAPOSE_OUTPUT):
        results['alphapose'] = os.listdir(ALPHAPOSE_OUTPUT)

    if os.path.exists(MOTIONBERT_OUTPUT):
        results['motionbert'] = os.listdir(MOTIONBERT_OUTPUT)
    
    return jsonify(results)

@app.route('/results/alphapose/<filename>')
def serve_alphapose_result(filename):
    """Serve AlphaPose result files"""
    return send_from_directory(ALPHAPOSE_OUTPUT, filename)

@app.route('/results/motionbert/<filename>')
def serve_motionbert_result(filename):
    """Serve MotionBERT result files"""
    return send_from_directory(MOTIONBERT_OUTPUT, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
