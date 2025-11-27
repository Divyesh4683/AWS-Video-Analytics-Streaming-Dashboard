#!/bin/bash

echo "Creating API Gateway..."

# Step 1: Create HTTP API
echo "Creating HTTP API..."
API_ID=$(aws apigatewayv2 create-api \
    --name mediaqos-uploader-api \
    --protocol-type HTTP \
    --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,OPTIONS",AllowHeaders="*" \
    --region us-east-1 \
    --query 'ApiId' \
    --output text)

if [ -z "$API_ID" ]; then
    echo "Failed to create API"
    exit 1
fi

echo "API Created: $API_ID"

# Step 2: Get Lambda ARN
echo "Getting Lambda function ARN..."
LAMBDA_ARN=$(aws lambda get-function \
    --function-name mediaqos-uploader \
    --region us-east-1 \
    --query 'Configuration.FunctionArn' \
    --output text)

if [ -z "$LAMBDA_ARN" ]; then
    echo "Lambda function not found"
    exit 1
fi

echo "Lambda ARN: $LAMBDA_ARN"

# Step 3: Create integration
echo "Creating API-Lambda integration..."
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri $LAMBDA_ARN \
    --payload-format-version 2.0 \
    --region us-east-1 \
    --query 'IntegrationId' \
    --output text)

if [ -z "$INTEGRATION_ID" ]; then
    echo "Failed to create integration"
    exit 1
fi

echo "Integration Created: $INTEGRATION_ID"

# Step 4: Create route
echo "Creating route..."
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key 'POST /upload' \
    --target integrations/$INTEGRATION_ID \
    --region us-east-1

echo "Route created: POST /upload"

# Step 5: Create stage (deploy API)
echo "Deploying API..."
aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name prod \
    --auto-deploy \
    --region us-east-1

echo "Stage deployed: prod"

# Step 6: Grant API Gateway permission to invoke Lambda
echo "Granting API Gateway invoke permission..."
aws lambda add-permission \
    --function-name mediaqos-uploader \
    --statement-id apigateway-invoke-$(date +%s) \
    --action lambda:InvokeFunction \
    --principal apigatewayv2.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:418272773708:${API_ID}/*/*" \
    --region us-east-1

echo "Permission granted"

# Step 7: Get API endpoint
API_ENDPOINT="https://${API_ID}.execute-api.us-east-1.amazonaws.com/prod/upload"

echo ""
echo "API GATEWAY CREATED SUCCESSFULLY!"
echo "=================================================="
echo "API Endpoint: $API_ENDPOINT"
echo "=================================================="
echo ""
echo "Saving endpoint to file..."
echo $API_ENDPOINT > api-endpoint.txt

echo "Endpoint saved to api-endpoint.txt"
echo ""
echo "Test with:"
echo "curl -X POST $API_ENDPOINT \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"filename\": \"test.mp4\", \"contentType\": \"video/mp4\"}'"
