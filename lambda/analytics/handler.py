import json
import boto3
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('mediaqos-videos')

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj)
    raise TypeError

def handler(event, context):
    """Analytics API - Get video stats"""
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    try:
        # Get path and method
        raw_path = event.get('rawPath', '')
        # Remove /prod prefix if present
        path = raw_path.replace('/prod', '')
        method = event.get('requestContext', {}).get('http', {}).get('method')
        
        print(f"Processing request: {method} {raw_path} -> {path}")
        
        # Route: GET /analytics/videos
        if path == '/analytics/videos' and method == 'GET':
            response = table.scan()
            videos = response.get('Items', [])
            
            total_videos = len(videos)
            completed_videos = len([v for v in videos if v.get('status') == 'COMPLETED'])
            total_views = sum([int(v.get('views', 0)) for v in videos])
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'totalVideos': total_videos,
                    'completedVideos': completed_videos,
                    'totalViews': total_views,
                    'videos': videos[:10]
                }, default=decimal_default)
            }
        
        # Route: GET /analytics/popular
        elif path == '/analytics/popular' and method == 'GET':
            response = table.scan()
            videos = response.get('Items', [])
            
            sorted_videos = sorted(
                videos, 
                key=lambda x: int(x.get('views', 0)), 
                reverse=True
            )[:5]
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'popularVideos': sorted_videos
                }, default=decimal_default)
            }
        
        # Route: POST /analytics/track
        elif path == '/analytics/track' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            video_id = body.get('videoId')
            
            if not video_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'success': False, 'error': 'videoId required'})
                }
            
            table.update_item(
                Key={'videoId': video_id},
                UpdateExpression='SET #views = if_not_exists(#views, :zero) + :inc, #updatedAt = :now',
                ExpressionAttributeNames={
                    '#views': 'views',
                    '#updatedAt': 'updatedAt'
                },
                ExpressionAttributeValues={
                    ':inc': 1,
                    ':zero': 0,
                    ':now': datetime.utcnow().isoformat()
                }
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True, 'message': 'View tracked'})
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({
                    'success': False, 
                    'error': 'Route not found',
                    'debug': {'path': path, 'rawPath': raw_path, 'method': method}
                })
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'error': str(e)})
        }
