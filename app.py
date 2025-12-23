#!/usr/bin/env python3
from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
import os
import subprocess
import uuid
from datetime import datetime
import shutil

app = Flask(__name__, static_folder='static')

# 增強 CORS 設定以支援跨域請求
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS", "HEAD"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Range"],
        "expose_headers": ["Content-Range", "Accept-Ranges", "Content-Length"],
        "supports_credentials": False
    }
})

# 設定最大上傳大小 (500MB)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024

# Configuration
UPLOAD_FOLDER = os.path.expanduser('~/project/uploads')
OUTPUT_FOLDER = os.path.expanduser('~/project/trimmed_videos')
ALPHAPOSE_OUTPUT = os.path.expanduser('~/project/alphapose_output')
MOTIONBERT_OUTPUT = os.path.expanduser('~/project/motionbert_output')

# Ensure directories exist
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
    """Upload a video file"""
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400
    
    # Generate unique filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    ext = file.filename.rsplit('.', 1)[1].lower()
    original_filename = f"video_{timestamp}_{unique_id}_original.{ext}"
    original_filepath = os.path.join(UPLOAD_FOLDER, original_filename)
    
    file.save(original_filepath)
    
    # 轉換為瀏覽器相容的 H.264 MP4 格式
    converted_filename = f"video_{timestamp}_{unique_id}.mp4"
    converted_filepath = os.path.join(UPLOAD_FOLDER, converted_filename)
    
    try:
        # 使用 ffmpeg 轉換為 H.264 MP4
        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-i', original_filepath,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac',
            '-movflags', '+faststart',  # 讓影片可以邊下載邊播放
            converted_filepath
        ]
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            # 轉換成功，刪除原始檔案
            os.remove(original_filepath)
            return jsonify({
                'success': True,
                'filename': converted_filename,
                'filepath': converted_filepath
            })
        else:
            # 轉換失敗，使用原始檔案
            os.rename(original_filepath, os.path.join(UPLOAD_FOLDER, f"video_{timestamp}_{unique_id}.{ext}"))
            return jsonify({
                'success': True,
                'filename': f"video_{timestamp}_{unique_id}.{ext}",
                'filepath': os.path.join(UPLOAD_FOLDER, f"video_{timestamp}_{unique_id}.{ext}"),
                'warning': 'Video conversion failed, using original format'
            })
    except subprocess.TimeoutExpired:
        # 超時，使用原始檔案
        return jsonify({
            'success': True,
            'filename': original_filename,
            'filepath': original_filepath,
            'warning': 'Video conversion timed out'
        })
    except Exception as e:
        return jsonify({
            'success': True,
            'filename': original_filename,
            'filepath': original_filepath,
            'warning': f'Video conversion error: {str(e)}'
        })

@app.route('/uploads/<filename>')
def serve_video(filename):
    """Serve uploaded video files with proper MIME type and range support"""
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    # 取得檔案副檔名來設定 MIME type
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    mime_types = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska'
    }
    mimetype = mime_types.get(ext, 'video/mp4')
    
    file_size = os.path.getsize(filepath)
    
    # 處理 Range 請求以支援影片串流
    range_header = request.headers.get('Range', None)
    if range_header:
        byte_start = 0
        byte_end = file_size - 1
        
        match = range_header.replace('bytes=', '').split('-')
        if match[0]:
            byte_start = int(match[0])
        if match[1]:
            byte_end = int(match[1])
        
        length = byte_end - byte_start + 1
        
        def generate():
            with open(filepath, 'rb') as f:
                f.seek(byte_start)
                remaining = length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        
        response = Response(
            generate(),
            status=206,
            mimetype=mimetype,
            direct_passthrough=True
        )
        response.headers.add('Content-Range', f'bytes {byte_start}-{byte_end}/{file_size}')
        response.headers.add('Accept-Ranges', 'bytes')
        response.headers.add('Content-Length', length)
        return response
    
    return send_from_directory(
        UPLOAD_FOLDER, 
        filename, 
        mimetype=mimetype,
        as_attachment=False
    )

@app.route('/process', methods=['POST'])
def process_video():
    """Trim video and run analysis script"""
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
    
    # Generate output filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_filename = f"trimmed_{timestamp}_{filename}"
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)
    
    try:
        # Calculate duration
        duration = float(end_time) - float(start_time)
        
        # Trim video using ffmpeg
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
        
        # Clear previous output files
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
        
        # Run the analysis script
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
        
        return jsonify({
            'success': True,
            'message': 'Video processed successfully',
            'trimmed_video': output_filename,
            'start_time': start_time,
            'end_time': end_time,
            'duration': duration,
            'script_output': script_result.stdout
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/results')
def get_results():
    """Get the analysis results"""
    results = {
        'alphapose': [],
        'motionbert': []
    }
    
    # List AlphaPose output files
    if os.path.exists(ALPHAPOSE_OUTPUT):
        results['alphapose'] = os.listdir(ALPHAPOSE_OUTPUT)
    
    # List MotionBERT output files
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
