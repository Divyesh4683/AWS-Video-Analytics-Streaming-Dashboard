import json
import boto3
import os
from datetime import datetime
from urllib.parse import unquote_plus

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

VIDEOS_TABLE = os.environ.get('VIDEOS_TABLE', 'mediaqos-videos')

def handler(event, context):
    print(f"Received event: {json.dumps(event)}")
    
    processed_count = 0
    
    for record in event['Records']:
        try:
            message_body = json.loads(record['body'])
            
            if 'Event' in message_body and message_body['Event'] == 's3:TestEvent':
                print("S3 test event, ignoring")
                continue
            
            s3_records = message_body.get('Records', [])
            
            for s3_record in s3_records:
                bucket = s3_record['s3']['bucket']['name']
                key = unquote_plus(s3_record['s3']['object']['key'])
                
                print(f"Processing: s3://{bucket}/{key}")
                
                key_parts = key.split('/')
                if len(key_parts) < 3 or key_parts[0] != 'uploads':
                    print(f"Skipping invalid key: {key}")
                    continue
                
                video_id = key_parts[1]
                
                update_video_status(
                    video_id=video_id,
                    status='PROCESSING',
                    metadata={
                        's3Key': key,
                        's3Bucket': bucket,
                        'fileSize': s3_record['s3']['object']['size']
                    }
                )
                
                process_video(bucket, key, video_id)
                
                update_video_status(
                    video_id=video_id,
                    status='COMPLETED',
                    metadata={
                        'processedAt': datetime.utcnow().isoformat(),
                        'videoUrl': f"https://{bucket}.s3.amazonaws.com/{key}"
                    }
                )
                
                processed_count += 1
                print(f"✅ Processed: {video_id}")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            continue
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': processed_count
        })
    }

def process_video(bucket, key, video_id):
    print(f"Processing video {video_id}...")
    response = s3_client.head_object(Bucket=bucket, Key=key)
    print(f"Size: {response.get('ContentLength', 0)} bytes")
    return True

def update_video_status(video_id, status, metadata=None):
    table = dynamodb.Table(VIDEOS_TABLE)
    
    update_expr = 'SET #status = :status, updatedAt = :updated'
    expr_attr_names = {'#status': 'status'}
    expr_attr_values = {
        ':status': status,
        ':updated': datetime.utcnow().isoformat()
    }
    
    if metadata:
        for key, value in metadata.items():
            update_expr += f', {key} = :{key}'
            expr_attr_values[f':{key}'] = value
    
    table.update_item(
        Key={'videoId': video_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values
    )
