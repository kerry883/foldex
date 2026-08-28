"""
Flask API server 
Exposes endpoints for next.js to generate videos using manim
"""

import sys
import traceback
from flask import Flask,request,jsonify
from flask_cors import CORS
from pydantic import BaseModel,ValidationError
from typing import Optional
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime
from pathlib import Path

from manim_generator import generate_video_from_llm ,ManimVideoGenerator
from r2_uploader import R2Uploader

load_dotenv()

app = Flask(__name__)
CORS(app)

class VideoGenerationRequest(BaseModel):
    code:str
    transcript:Optional[str] = ""
    scene_name: Optional[str] = "GeneratedScene"
    quality: Optional[str] = "medium_quality"


class VideoGenerationResponse(BaseModel):
    success: bool
    video_url: Optional[str] = None
    video_key: Optional[str] = None
    file_size: Optional[int] = None
    error: Optional[str] = None
    generation_time: Optional[float] = None

@app.route('/generate-video',methods=['POST'])
def generate_video():
    """
     Generate a math video from code and transcript
    
    Request Body:
    {
        "code": "manim code here",
        "transcript": "narration text here",
        "scene_name": "optional scene name",
        "quality": "medium_quality",
    }
    """
    try:
        data = request.get_json()
        req= VideoGenerationRequest(**data)

        unique_id = str(uuid.uuid4())[:8]
        scene_name = f"{req.scene_name}_{unique_id}"

        start_time = datetime.now()
        #generate video
        print(f"Generating video for scene: {scene_name}")
        result = generate_video_from_llm(
            code=req.code,
            transcript=req.transcript,
            scene_name=scene_name,
            quality=req.quality
        )
        if not result["success"]:
            return jsonify({
                "success": False,
                "error_type": result.get("error_type", "UnknownError"),
                "error_message": result.get("error_message", "Unknown error during video generation"),
                "error_location": result.get("error_location"),
                "full_traceback": result.get("full_traceback"),
            }), 500
        
        try:
            print("generating thumbnail ...")
            temp_gen = ManimVideoGenerator()
            thumbnail_path = temp_gen.generate_thumbnail(scene_name=scene_name,video_path=Path(result["video_path"]))
        except Exception as e:
            print(f"Warning: Failed to generate thumbnail: {e}")
            thumbnail_path = None
        
        print(f"uploading to R2")
        uploader = R2Uploader()

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{scene_name}_{timestamp}.mp4"
        upload_result = uploader.upload_file(
            result["video_path"],
            object_name=filename,
        )

        if not upload_result["success"]:
            return jsonify({
                "success": False,
                "error": f"upload error: {upload_result.get('error', 'Unknown error during file upload')}"
            }), 500
        thumbnail_url = None
        if thumbnail_path and os.path.exists(thumbnail_path):
            thumn_filename = f"{scene_name}_{timestamp}_thumbnail.png"
            thumb_upload = uploader.upload_file(
                str(thumbnail_path),
                object_name=thumn_filename
            )
            if thumb_upload["success"]:
                thumbnail_url = thumb_upload["url"]
            else:
                print(f"Thumbnail upload failed:{thumb_upload.get('error')}")

        end_time = datetime.now()
        generation_time = (end_time - start_time).total_seconds()

        print(f"video generation and upload completed in {generation_time} seconds")
        
        return jsonify({
            "success": True,
            "video_url": upload_result["url"],
            "video_key": upload_result["key"],
            "thumbnail_url": thumbnail_url,
            "file_size": upload_result["size"],
            "generation_time": generation_time,
            "scene_name": scene_name
        })
    except ValidationError as e:
        return jsonify({
            "success": False,
            "error": "Invalid request data",
            "details": e.errors()
        }), 400        
    except Exception as e:
        print(traceback.format_exc(), file=sys.stderr)
        return jsonify({
            "success": False,
            "error": "Internal Server Error", 
            "details": str(e)
        }), 500
    finally:
        try:
            # Check if result exists, and if it has a video_path, and if that file is on disk
            if result and result.get("video_path") and os.path.exists(result["video_path"]):
                os.remove(result["video_path"])
                
            # Check if thumbnail_path exists and is on disk
            if thumbnail_path and os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
        except Exception as cleanup_error:
            print(f"Warning: Cleanup failed: {cleanup_error}")

@app.route('/health',methods=['GET'])
def health():
    """Check if the API is running"""
    return jsonify({"status": "ok"})

@app.route('/delete',methods=['POST'])
def delete_video():
    """
    Delete a video from R2 storage"""
    try:
        data = request.get_json()
        objectname = data.get("object_name")
        if not objectname:
            return jsonify({"success": False, "error": "object_name is required"}), 400
        uploader = R2Uploader()
        result = uploader.delete_file(object_name=objectname)
        if result["success"]:
            return jsonify({
                "success": True
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get("error","Unknown error during deletion")
            }), 500
    except Exception as e:
        print(f" Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)