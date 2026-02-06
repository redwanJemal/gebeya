"""S3/MinIO storage service."""

import uuid
from datetime import timedelta

import boto3
from botocore.config import Config

from app.core.config import settings


class StorageService:
    """S3-compatible storage service."""

    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.S3_BUCKET

    def ensure_bucket(self):
        """Create bucket if it doesn't exist."""
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception:
            try:
                self.client.create_bucket(Bucket=self.bucket)
                # Set bucket policy for public read
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{self.bucket}/*"],
                        }
                    ],
                }
                import json
                self.client.put_bucket_policy(
                    Bucket=self.bucket, Policy=json.dumps(policy)
                )
            except Exception as e:
                print(f"Failed to create bucket: {e}")

    def upload_file(
        self,
        file_data: bytes,
        filename: str,
        content_type: str = "application/octet-stream",
        folder: str = "uploads",
    ) -> str:
        """Upload file and return public URL."""
        # Generate unique filename
        ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
        unique_name = f"{folder}/{uuid.uuid4()}.{ext}" if ext else f"{folder}/{uuid.uuid4()}"

        self.client.put_object(
            Bucket=self.bucket,
            Key=unique_name,
            Body=file_data,
            ContentType=content_type,
        )

        # Return public URL
        return f"{settings.S3_ENDPOINT}/{self.bucket}/{unique_name}"

    def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Get presigned URL for upload."""
        return self.client.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def delete_file(self, url: str) -> bool:
        """Delete file by URL."""
        try:
            # Extract key from URL
            prefix = f"{settings.S3_ENDPOINT}/{self.bucket}/"
            if url.startswith(prefix):
                key = url[len(prefix):]
                self.client.delete_object(Bucket=self.bucket, Key=key)
                return True
        except Exception as e:
            print(f"Failed to delete file: {e}")
        return False


# Singleton
storage_service = StorageService()
