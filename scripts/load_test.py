# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
Load Testing Script for Video Upload Pipeline
Tests: API Gateway, Lambda, S3, SQS, Processing Pipeline
"""

import requests
import boto3
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import sys

# Configuration
API_ENDPOINT = "https://n3r8pu738e.execute-api.us-east-1.amazonaws.com/prod/upload"
BUCKET_NAME = "mediaqos-videos-418272773708"
REGION = "us-east-1"
NUM_UPLOADS = 50

# AWS Clients
s3_client = boto3.client('s3', region_name=REGION)
dynamodb = boto3.resource('dynamodb', region_name=REGION)

# Metrics
metrics = {
    'total_uploads': 0,
    'successful_uploads': 0,
    'failed_uploads': 0,
    'api_response_times': [],
    'upload_times': [],
    'errors': []
}

def request_upload_url(video_num):
    """Request presigned upload URL from API"""
    try:
        start = time.time()
        
        response = requests.post(
            API_ENDPOINT,
            headers={'Content-Type': 'application/json'},
            json={
                'filename': f'load-test-video-{video_num}.mp4',
                'contentType': 'video/mp4'
            },
            timeout=10
        )
        
        api_time = time.time() - start
        metrics['api_response_times'].append(api_time)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return data['videoId'], data['uploadUrl'], data['uploadFields'], api_time
        
        return None, None, None, api_time
    except Exception as e:
        metrics['errors'].append(f"API Error {video_num}: {str(e)}")
        return None, None, None, 0

def upload_to_s3(video_id, upload_url, upload_fields, video_num):
    """Upload dummy file to S3 using presigned URL"""
    try:
        start = time.time()
        
        # Create dummy file content
        file_content = f"Load test video #{video_num} - {datetime.utcnow().isoformat()}".encode()
        
        # Prepare form data
        files = {'file': (f'load-test-{video_num}.mp4', file_content, 'video/mp4')}
        
        response = requests.post(
            upload_url,
            data=upload_fields,
            files=files,
            timeout=30
        )
        
        upload_time = time.time() - start
        metrics['upload_times'].append(upload_time)
        
        return response.status_code in [200, 204], upload_time
    except Exception as e:
        metrics['errors'].append(f"Upload Error {video_num}: {str(e)}")
        return False, 0

def process_single_upload(video_num):
    """Process a single video upload (end-to-end)"""
    print(f"[*] Starting upload #{video_num}")
    
    # Step 1: Request upload URL
    video_id, upload_url, upload_fields, api_time = request_upload_url(video_num)
    
    if not video_id:
        metrics['failed_uploads'] += 1
        print(f"[X] Failed upload #{video_num}: No upload URL")
        return {'video_num': video_num, 'success': False, 'error': 'No upload URL'}
    
    # Step 2: Upload to S3
    upload_success, upload_time = upload_to_s3(video_id, upload_url, upload_fields, video_num)
    
    if not upload_success:
        metrics['failed_uploads'] += 1
        print(f"[X] Failed upload #{video_num}: S3 upload failed")
        return {'video_num': video_num, 'video_id': video_id, 'success': False, 'error': 'S3 upload failed'}
    
    metrics['successful_uploads'] += 1
    print(f"[OK] Completed upload #{video_num} (VideoID: {video_id})")
    
    return {
        'video_num': video_num,
        'video_id': video_id,
        'success': True,
        'api_time': api_time,
        'upload_time': upload_time
    }

def run_load_test():
    """Run concurrent load test"""
    print("=" * 60)
    print("LOAD TEST: Video Upload Pipeline")
    print("=" * 60)
    print(f"API Endpoint: {API_ENDPOINT}")
    print(f"Concurrent Uploads: {NUM_UPLOADS}")
    print(f"Start Time: {datetime.utcnow().isoformat()}")
    print("=" * 60)
    print()
    
    start_time = time.time()
    results = []
    
    # Execute concurrent uploads
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(process_single_upload, i) for i in range(1, NUM_UPLOADS + 1)]
        
        for future in as_completed(futures):
            try:
                result = future.result()
                results.append(result)
                metrics['total_uploads'] += 1
            except Exception as e:
                metrics['errors'].append(f"Thread error: {str(e)}")
    
    total_time = time.time() - start_time
    
    # Print results
    print()
    print("=" * 60)
    print("LOAD TEST RESULTS")
    print("=" * 60)
    print(f"Total Duration: {total_time:.2f} seconds")
    print(f"Total Uploads: {metrics['total_uploads']}")
    print(f"[OK] Successful: {metrics['successful_uploads']}")
    print(f"[X] Failed: {metrics['failed_uploads']}")
    print(f"Success Rate: {(metrics['successful_uploads'] / metrics['total_uploads'] * 100):.1f}%")
    print()
    
    if metrics['api_response_times']:
        print("API Response Times:")
        print(f"   Min: {min(metrics['api_response_times']):.3f}s")
        print(f"   Max: {max(metrics['api_response_times']):.3f}s")
        print(f"   Avg: {sum(metrics['api_response_times']) / len(metrics['api_response_times']):.3f}s")
        print()
    
    if metrics['upload_times']:
        print("S3 Upload Times:")
        print(f"   Min: {min(metrics['upload_times']):.3f}s")
        print(f"   Max: {max(metrics['upload_times']):.3f}s")
        print(f"   Avg: {sum(metrics['upload_times']) / len(metrics['upload_times']):.3f}s")
        print()
    
    print(f"Throughput: {metrics['successful_uploads'] / total_time:.2f} uploads/second")
    print()
    
    if metrics['errors']:
        print("Errors:")
        for error in metrics['errors'][:10]:
            print(f"   - {error}")
        if len(metrics['errors']) > 10:
            print(f"   ... and {len(metrics['errors']) - 10} more")
    
    print("=" * 60)
    
    return results

def check_processing_status():
    """Check how many videos were processed"""
    print()
    print("Waiting 10 seconds for processing...")
    time.sleep(10)
    
    print("Checking DynamoDB for processed videos...")
    
    try:
        table = dynamodb.Table('mediaqos-videos')
        response = table.scan(
            FilterExpression='begins_with(videoId, :prefix)',
            ExpressionAttributeValues={':prefix': 'load-test'}
        )
        
        items = response.get('Items', [])
        completed = sum(1 for item in items if item.get('status') == 'COMPLETED')
        processing = sum(1 for item in items if item.get('status') == 'PROCESSING')
        
        print(f"   Total in DB: {len(items)}")
        print(f"   [OK] Completed: {completed}")
        print(f"   [*] Processing: {processing}")
        
    except Exception as e:
        print(f"   [X] Error checking status: {str(e)}")

if __name__ == "__main__":
    try:
        results = run_load_test()
        check_processing_status()
        
        print()
        print("[OK] Load test completed successfully!")
        
    except KeyboardInterrupt:
        print("\n[!] Load test interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n[X] Load test failed: {str(e)}")
        sys.exit(1)
