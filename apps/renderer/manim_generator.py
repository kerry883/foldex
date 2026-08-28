

from manim import *
from pathlib import Path
import subprocess
import json
from typing import Dict, Any
import os
import sys
import shutil
import re
import ast

def pre_flight_check(code_string: str) -> tuple[bool, str]:
    """
    Simulates a compiler check. Catches syntax, indentation, 
    and undefined variable errors before Manim ever runs.
    """
    errors = []
    
    # 1. Memory Compile (Catches Syntax & Indentation)
    try:
        ast.parse(code_string)
    except SyntaxError as e:
        # If the syntax is broken, flake8 will fail anyway, so return immediately
        return False, f"SyntaxError on line {e.lineno}: {e.msg}\nCode: {e.text}"

    # 2. Linter Check (Catches Undefined Variables & Imports)
    temp_file = "temp_linter_check.py"
    try:
        lint_header = "from manim import *\nfrom manim_voiceover import VoiceoverScene\nfrom manim_voiceover.services.gtts import GTTSService\n"
        with open(temp_file, "w", encoding="utf-8") as f:
            f.write(lint_header + code_string)

        # F821 = Undefined name, E999 = Syntax Error
        result = subprocess.run(
            ["flake8", temp_file, "--select=F821,E999"], 
            capture_output=True, 
            text=True
        )
        
        if result.returncode != 0:
            errors.append(f"Static Analysis (Compiler) found the following errors:\n{result.stdout}")
            
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

    if errors:
        return False, "\n".join(errors)
    
    return True, "Passed"
    

def parse_manim_error(stderr: str) -> Dict[str, Any]:
    """
    Parse Manim's stderr output (which includes Rich box-drawing characters,
    progress bars, and formatted tracebacks) into a clean, structured error dict.
    """
    # 1. Strip Rich box-drawing / decoration characters
    box_chars = re.compile(r'[\u2500-\u257F]')  # Box Drawing Unicode block
    cleaned = box_chars.sub('', stderr)

    # 2. Remove ANSI escape codes (colors, bold, etc.)
    ansi_escape = re.compile(r'\x1b\[[0-9;]*m')
    cleaned = ansi_escape.sub('', cleaned)

    # 3. Remove progress bar lines  (e.g. "Animation 0: Write(...):   0%|...")
    cleaned = re.sub(r'Animation \d+:.*?\n', '', cleaned)
    # Also remove blank lines left behind by progress bar clearing
    cleaned = re.sub(r'^\s*$\n', '', cleaned, flags=re.MULTILINE)

    # 4. Extract the final exception line  (e.g. "AttributeError: ...")
    error_type = "UnknownError"
    error_message = cleaned.strip() or stderr.strip()
    # Match common Python exception format at end of traceback
    exc_match = re.search(r'^([A-Za-z_][A-Za-z0-9_]*(?:Error|Exception|Warning)):\s*(.+)$',
                          stderr, re.MULTILINE)
    if exc_match:
        error_type = exc_match.group(1)
        error_message = exc_match.group(2).strip()

    # 5. Extract the failing location from the user's script
    #    Look for lines like "/app/output/SomeScene.py:94 in construct"
    location = None
    loc_match = re.search(r'(/app/output/\S+\.py):(\d+)\s+in\s+(\w+)', stderr)
    if loc_match:
        filename = os.path.basename(loc_match.group(1))
        line_no = loc_match.group(2)
        func_name = loc_match.group(3)
        location = f"{filename}, line {line_no}, in {func_name}"
    else:
        # Fallback: look for any .py file reference in the traceback
        loc_match2 = re.search(r'File "([^"]+\.py)", line (\d+)', stderr)
        if loc_match2:
            filename = os.path.basename(loc_match2.group(1))
            line_no = loc_match2.group(2)
            location = f"{filename}, line {line_no}"

    # 6. Build a clean traceback (stripped of box chars but preserving structure)
    clean_traceback = re.sub(r'^\s*$\n', '', cleaned, flags=re.MULTILINE).strip()

    return {
        "error_type": error_type,
        "error_message": error_message,
        "error_location": location,
        "full_traceback": clean_traceback,
    }

class ManimVideoGenerator:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def create_scene_file(self, code: str, requested_scene_name: str, use_voiceover: bool = True) -> tuple[Path, str]:
        """
        Create a temporary python file with the manim scene code.
        If use_voiceover is True, wraps the code to use VoiceoverScene.
        """
        code = code.strip()
        final_scene_name = requested_scene_name

        match = re.search(r"class\s+(\w+)\(.*\):", code)

        if match:
            # User provided a full class
            final_scene_name = match.group(1)
            print(f"Auto-detected class name: {final_scene_name}")
            
            # Check if already using VoiceoverScene
            if use_voiceover and "VoiceoverScene" not in code:
                # Replace Scene with VoiceoverScene
                # Matches any class definition and replaces its parent classes
                code = re.sub(r"class\s+\w+\(.*?\):", f"class {final_scene_name}(VoiceoverScene, MovingCameraScene):", code)
            
            imports = "from manim import *\n"
            if use_voiceover:
                imports += "from manim_voiceover import VoiceoverScene\n"
                imports += "from manim_voiceover.services.gtts import GTTSService\n"
                imports += "import os\n"
                imports += "import sys\n"
                imports += "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n"
                imports += "from custom_google_tts import CustomGoogleService\n"
            
            code = imports + code if imports not in code else code
        else:
            # No class detected, create one
            indented_code = self._indent_code(code, 8)
            
            if use_voiceover:
                code = f"""
from manim import *
from manim_voiceover import VoiceoverScene
from manim_voiceover.services.gtts import GTTSService

# Inherit from both to allow camera moves by default
class {final_scene_name}(VoiceoverScene, MovingCameraScene):
    def construct(self):
        MovingCameraScene.setup(self) # Required setup
{indented_code}
"""
            else:
                code = f"""
from manim import *

class {final_scene_name}(MovingCameraScene):
    def construct(self):
        MovingCameraScene.setup(self)
{indented_code}
"""
        
        scene_file = self.output_dir / f"{final_scene_name}.py"
        with open(scene_file, "w", encoding="utf-8") as f:
            f.write(code)
        import shutil
        #point the path of our custom_google_tts.py
        custom_tts_source = Path("custom_google_tts.py")
        if custom_tts_source.exists():
            #copy the file to the same place the code is written using shutil
            shutil.copy(custom_tts_source, self.output_dir / "custom_google_tts.py")
        else:
            docker_path = Path("/app/custom_google_tts.py")
            if docker_path.exists():
                shutil.copy(docker_path, self.output_dir / "custom_google_tts.py")
            else:
                print("WARNING: custom_google_tts.py not found! Generated script might fail.")
        return scene_file, final_scene_name
        
    def _indent_code(self, code: str, spaces: int = 4) -> str:
        """Add indentation to code, handling empty lines correctly"""
        indent = " " * spaces
        return "\n".join((indent + line) if line.strip() else line for line in code.split("\n"))
        
    def render_video(self, scene_file: Path, scene_name: str = "GeneratedScene", quality: str = "medium_quality") -> Dict[str, Any]:
        """
        Render the manim scene to video
        """
        try:
            cmd = [
                sys.executable, "-m", "manim",
                str(scene_file),
                scene_name,
                f"-q{quality[0]}",
                "--format=mp4",
                f"--media_dir={self.output_dir}"
            ]

            print(f"Executing: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=1000 
            )
            
            print("--- MANIM STDOUT ---")
            print(result.stdout)
            print("--- MANIM STDERR ---")
            print(result.stderr)
            print("--------------------")

            if result.returncode != 0:
                print(f"Manim Failed! Return Code: {result.returncode}")
                parsed = parse_manim_error(result.stderr)
                return {
                    "success": False,
                    **parsed,
                }
            
            video_file = self._find_video_file(scene_name)

            return {
                "success": True,
                "video_path": str(video_file),
                "stdout": result.stdout,
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error_type": "TimeoutError",
                "error_message": "Video generation timed out after 1000 seconds",
                "error_location": None,
                "full_traceback": None,
            }
        except Exception as e:
            print(f"PYTHON ERROR: {str(e)}")
            return {
                "success": False,
                "error_type": type(e).__name__,
                "error_message": str(e),
                "error_location": None,
                "full_traceback": None,
            }
        
    def _find_video_file(self, scene_name: str) -> Path:
        """Find the rendered video file"""
        search_dir = list(self.output_dir.rglob(f"{scene_name}.mp4"))

        if not search_dir:
            raise FileNotFoundError(f"Generated video file {scene_name}.mp4 not found in {self.output_dir}")
        
        return max(search_dir, key=lambda p: p.stat().st_mtime)

    def generate_thumbnail(self,scene_name:str,video_path: Path) -> Path:
        """Generate a thumbnail image for the video using ffmpeg"""
        thumbnail_path = self.output_dir / f"{scene_name}_thumbnail.png"

        cmd = [
            "ffmpeg",
            "-i", str(video_path),
            "-ss", "00:00:03.000",
            "-vframes", "1",
            "-y",
            str(thumbnail_path)
        ]  
        subprocess.run(cmd,capture_output=True)
        return thumbnail_path
    
    def cleanup(self):
        """Cleanup temporary files"""
        if self.output_dir.exists():
            try:
                shutil.rmtree(self.output_dir)
            except Exception as e:
                print(f"Warning: Failed to cleanup directory: {e}")


def generate_video_from_llm(code: str, transcript: str = "", scene_name: str = "MathScene", quality: str = "medium_quality", use_voiceover: bool = True) -> Dict[str, Any]:
    """
    Main entry point for API calls
    
    Args:
        code: Manim code (with or without voiceover)
        transcript: Optional transcript (only used if code doesn't have voiceover)
        scene_name: Name for the scene
        quality: Video quality
        use_voiceover: Whether to use manim-voiceover (default True)
    """

    is_valid, compiler_error = pre_flight_check(code)
    
    if not is_valid:
        print("Blocked by Static Analyzer. Returning errors to LLM.")
        # We return the exact same dictionary structure so the Flask route 
        # doesn't need to change to handle this!
        return {
            "success": False,
            "error_type": "StaticAnalysisError",
            "error_message": "Code failed pre-flight compilation.",
            "error_location": "Static Linter",
            "full_traceback": compiler_error,
        }
    generator = ManimVideoGenerator()
    try:
        # Create scene file
        scene_file, actual_scene_name = generator.create_scene_file(code, scene_name, use_voiceover)
        print(f"Created scene file: {scene_file} for class: {actual_scene_name}")
        
        # Render video (voiceover is handled by Manim itself if code uses it)
        render_result = generator.render_video(scene_file, actual_scene_name, quality)
        if not render_result["success"]:
            return render_result
            
        video_path = Path(render_result["video_path"])
        print(f"Final video at: {video_path}")

        return {
            "success": True,
            "video_path": str(video_path),
            "file_size": video_path.stat().st_size,
            "scene_name": scene_name,
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "error_location": None,
            "full_traceback": traceback.format_exc(),
        }