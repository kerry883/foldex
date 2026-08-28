"""
Cloudflare R2 uploader 
Handles uploading video to R2 storage
"""

import boto3
from botocore.client import Config
from pathlib import Path
from typing import Dict,Optional
import os
from dotenv import load_dotenv
import mimetypes

load_dotenv()

class R2Uploader:
    def __init__(self):
        self.account_id = os.getenv("R2_ACCOUNT_ID")
        self.access_key = os.getenv("R2_ACCESS_KEY_ID")
        self.secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("R2_BUCKET_NAME")
        self.public_url = os.getenv("R2_PUBLIC_URL")

        #configur s3 client for R2
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{self.account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
    
    def upload_file(self,file_path:str,object_name:Optional[str]=None)->Dict[str,any]:
        """
         Upload a file to R2 bucket
        
        Args:
            file_path: Path to the file to upload
            object_name: S3 object name. If not specified, file_path name is used
            folder: Folder prefix in bucket
        
        Returns:
            Dict with success status and URL
        """
        file_path = Path(file_path)
        if not file_path.exists():
            return {
                "success": False,
                "error": f"File does not exist: {file_path}"
            }
        
        #generate object name
        if object_name is None:
            object_name = file_path.name

        
        
        # detect content type 
        content_type,_ = mimetypes.guess_type(str(file_path))
        if content_type is None:
            content_type = "application/octet-stream"

        try:
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                object_name,
                ExtraArgs={
                    'ContentType': content_type,
                    'CacheControl':'public, max-age=31536000',
                }
            )

            public_url = f"{self.public_url}/{object_name}"

            return {
                "success":True,
                "url": public_url,
                "key":object_name,
                "bucket": self.bucket_name,
                "size": file_path.stat().st_size,
                "content_type": content_type,
            }
        except Exception as e:
            return {
                "success":False,
                "error": str(e)
            }
        
    def delete_file(self, object_name: str) -> Dict[str, any]:
        """Delete a file from R2"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_name
            )
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}


