#!/bin/bash

# Get all video IDs from DynamoDB
VIDEO_IDS=$(aws dynamodb scan \
    --table-name mediaqos-videos \
    --region us-east-1 \
    --query 'Items[*].videoId.S' \
    --output text)

echo "Adding view counts to videos..."

for VIDEO_ID in $VIDEO_IDS; do
    # Random view count between 10-500
    VIEWS=$((RANDOM % 491 + 10))
    
    aws dynamodb update-item \
        --table-name mediaqos-videos \
        --key "{\"videoId\": {\"S\": \"$VIDEO_ID\"}}" \
        --update-expression "SET #views = :views" \
        --expression-attribute-names '{"#views": "views"}' \
        --expression-attribute-values "{\":views\": {\"N\": \"$VIEWS\"}}" \
        --region us-east-1 > /dev/null
    
    echo "✅ Added $VIEWS views to video $VIDEO_ID"
done

echo ""
echo "✅ View counts added to all videos!"
