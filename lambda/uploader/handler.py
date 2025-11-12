import json
import boto3
import uuid
from datetime import datetime

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

BUCKET_NAME = 'mediaqos-videos-418272773708'
TABLE_NAME = 'mediaqos-videos'

def handler(event, context):
    # CORS headers for ALL responses
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    try:
        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename', 'video.mp4')
        content_type = body.get('contentType', 'video/mp4')
        
        video_id = str(uuid.uuid4())
        s3_key = f"uploads/{video_id}/{filename}"
        
        table = dynamodb.Table(TABLE_NAME)
        table.put_item(
            Item={
                'videoId': video_id,
                'filename': filename,
                'status': 'PENDING_UPLOAD',
                'createdAt': datetime.utcnow().isoformat(),
                'updatedAt': datetime.utcnow().isoformat()
            }
        )
        
        presigned_post = s3_client.generate_presigned_post(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Fields={'Content-Type': content_type},
            Conditions=[
                {'Content-Type': content_type},
                ['content-length-range', 0, 104857600]
            ],
            ExpiresIn=3600
        )
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'videoId': video_id,
                'uploadUrl': presigned_post['url'],
                'uploadFields': presigned_post['fields'],
                'message': f'Upload URL generated for {filename}'
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }
