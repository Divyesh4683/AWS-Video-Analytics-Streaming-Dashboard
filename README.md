# Video Analytics Streaming Dashboard

## Project Summary

This project implements a cloud-native video analytics platform on AWS using containerized microservices on Amazon EKS. The system provides video upload, processing, storage, and analytics visualization capabilities. Infrastructure is provisioned through CloudFormation templates, with automated deployment via GitHub Actions CI/CD pipeline.

The platform consists of a React frontend served through nginx containers, three serverless Lambda functions for backend processing, and Kubernetes-managed deployment on EKS. All components communicate through AWS services including S3, DynamoDB, API Gateway, and AppSync.

## System Components

### Frontend Application

The frontend is a React single-page application containerized with Docker and deployed on EKS. The nginx 1.27-alpine base image provides the web server with minimal security vulnerabilities. The application communicates with backend services through AWS AppSync for GraphQL and API Gateway for REST endpoints.

**Key Files:**
- `web/player-update/Dockerfile` - Container build configuration
- `web/player-update/nginx.conf` - Reverse proxy configuration
- `web/player-update/docker-compose.yml` - Local development setup

### Lambda Functions

Three Lambda functions handle serverless backend operations:

**Video Uploader** (`lambda/uploader/handler.py`)
Generates pre-signed S3 URLs for secure video uploads. Creates unique video identifiers, registers uploads in DynamoDB, and returns temporary credentials for direct S3 upload.

**Video Processor** (`lambda/processor/handler.py`)
Processes S3 events through SQS queue. Updates video status in DynamoDB, extracts metadata, and manages processing workflows.

**Analytics Function** (`lambda/analytics/handler.py`)
Provides REST API endpoints for video statistics. Queries DynamoDB to return aggregate metrics including total videos, completion rates, and view counts.

### Infrastructure Templates

**deployment.yaml** - Complete backend stack including:
- Lambda functions with IAM roles
- API Gateway endpoints
- DynamoDB tables
- S3 buckets with event notifications
- SQS queues for event processing
- AppSync GraphQL API
- CloudFront distribution for content delivery

**eks-network.yaml** - VPC with public/private subnets, NAT Gateway, Internet Gateway, and route tables across two availability zones.

**eks-cluster.yaml** - EKS control plane and two managed node groups (frontend workloads on t3.medium, system services on t3.small).

### Kubernetes Manifests

- `frontend-deployment.yaml` - Two-replica deployment with resource limits and rolling update strategy
- `frontend-hpa.yaml` - Horizontal Pod Autoscaler (2-10 replicas based on CPU/memory)
- `frontend-ingress.yaml` - Application Load Balancer configuration
- `network-policies.yaml` - Network segmentation and pod-to-pod communication rules
- `rbac.yaml` - Role-based access control policies
- `configmaps-secrets.yaml` - Configuration and sensitive data management
- `cluster-autoscaler-deployment.yaml` - Automatic node scaling based on pod requirements

## Deployment Guide

### Prerequisites

- AWS CLI version 2.x configured with appropriate credentials
- kubectl version 1.30 or compatible
- Docker Engine version 20.x or later
- Git for repository management

### Step 1: Deploy Backend Infrastructure

Deploy the complete backend stack including Lambda functions, S3, DynamoDB, and API Gateway:

```bash
aws cloudformation create-stack \
  --stack-name video-analytics-backend \
  --template-body file://cloudformation/deployment.yaml \
  --capabilities CAPABILITY_IAM \
  --parameters \
    ParameterKey=ArtifactBucket,ParameterValue=your-artifacts-bucket \
    ParameterKey=DeployFunctionKey,ParameterValue=dist/deploy-function.zip \
  --region us-east-2

aws cloudformation wait stack-create-complete \
  --stack-name video-analytics-backend \
  --region us-east-2
```

This creates all serverless components including Lambda functions, DynamoDB tables, S3 buckets, SQS queues, and API Gateway endpoints.

### Step 2: Deploy Network Infrastructure

```bash
aws cloudformation create-stack \
  --stack-name video-analytics-network \
  --template-body file://cloudformation/eks-network.yaml \
  --region us-east-2

aws cloudformation wait stack-create-complete \
  --stack-name video-analytics-network \
  --region us-east-2
```

### Step 3: Deploy EKS Cluster

```bash
aws cloudformation create-stack \
  --stack-name video-analytics-cluster \
  --template-body file://cloudformation/eks-cluster.yaml \
  --capabilities CAPABILITY_IAM \
  --region us-east-2

aws cloudformation wait stack-create-complete \
  --stack-name video-analytics-cluster \
  --region us-east-2
```

EKS cluster creation takes 10-15 minutes.

### Step 4: Configure kubectl and Install Components

```bash
# Configure kubectl
aws eks update-kubeconfig \
  --name video-analytics-cluster \
  --region us-east-2

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=video-analytics-cluster

# Apply Kubernetes manifests
kubectl apply -f kubernetes/namespaces.yaml
kubectl apply -f kubernetes/rbac.yaml
kubectl apply -f kubernetes/network-policies.yaml
kubectl apply -f kubernetes/configmaps-secrets.yaml
```

### Step 5: Deploy Frontend via CI/CD

The frontend deploys automatically through GitHub Actions when code is pushed. Manual deployment:

```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  418272773708.dkr.ecr.us-east-2.amazonaws.com

# Build and push image
cd web/player-update
docker build -t 418272773708.dkr.ecr.us-east-2.amazonaws.com/video-analytics-frontend:v1-video-analytics .
docker push 418272773708.dkr.ecr.us-east-2.amazonaws.com/video-analytics-frontend:v1-video-analytics

# Deploy to Kubernetes
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/frontend-hpa.yaml
kubectl apply -f kubernetes/frontend-ingress.yaml
```

## Configuration Management

Configuration is managed through Kubernetes ConfigMaps and Secrets:

```bash
# Apply configuration
kubectl apply -f kubernetes/configmaps-secrets.yaml

# Update existing deployment
kubectl rollout restart deployment/video-analytics-frontend -n video-analytics
```

**ConfigMap structure:**
```yaml
data:
  ANALYTICS_API_URL: "https://your-api.execute-api.us-east-2.amazonaws.com"
  APPSYNC_ENDPOINT: "https://your-appsync.appsync-api.us-east-2.amazonaws.com/graphql"
  ENVIRONMENT: "production"
  LOG_LEVEL: "info"
```

**Secrets management:**
```bash
kubectl create secret generic appsync-credentials \
  --from-literal=api-key=your-api-key \
  -n video-analytics
```

## Continuous Integration and Deployment

GitHub Actions pipeline (`.github/workflows/deploy-frontend.yml`) automates the deployment process:

**Pipeline stages:**
1. Checkout code and authenticate with AWS
2. Build Docker image with version tags
3. Run Trivy security scan (fails on critical/high vulnerabilities)
4. Push image to Amazon ECR
5. Update Kubernetes deployment
6. Verify rollout completion

**Version tagging:**
- Development: `dev-YYYYMMDD-<sha>` (e.g., dev-20251210-84a7e7a)
- Releases: `v1-video-analytics`, `v2-video-analytics`

**Create a release:**
```bash
git tag v1-video-analytics -m "Production release"
git push origin v1-video-analytics
```

**Security scanning:**
Current vulnerability status: 0 critical, 0 high, ~25 medium (in unused libraries)

## Security Implementation

**Container Security:**
- Base image: nginx 1.27-alpine with regular security updates
- Trivy vulnerability scanning in CI/CD pipeline
- ECR tag immutability enabled

**Network Security:**
- Kubernetes NetworkPolicies for pod-to-pod communication control
- Default deny-all ingress policy with explicit ALB allow rules
- Cross-namespace traffic blocking
- Private subnets for worker nodes with NAT Gateway for outbound access

**Access Control:**
- IAM roles with least-privilege permissions for Lambda functions
- Kubernetes RBAC for service account permissions
- Separate roles for different components

**Data Protection:**
- S3 encryption at rest (AES-256)
- ECR image encryption
- DynamoDB encryption with AWS-managed keys

## Project Repository Structure

```
.
├── .github/workflows/          # CI/CD pipeline definitions
├── cloudformation/             # Infrastructure as Code templates
│   ├── deployment.yaml        # Complete backend stack (Lambda, API Gateway, DynamoDB, S3, SQS)
│   ├── eks-network.yaml       # VPC and networking
│   └── eks-cluster.yaml       # EKS cluster and node groups
├── kubernetes/                 # Kubernetes manifests
│   ├── frontend-deployment.yaml
│   ├── frontend-hpa.yaml
│   ├── frontend-ingress.yaml
│   ├── namespaces.yaml
│   ├── rbac.yaml
│   ├── network-policies.yaml
│   ├── configmaps-secrets.yaml
│   └── cluster-autoscaler-deployment.yaml
├── lambda/                     # Serverless functions
│   ├── analytics/             # Video analytics API
│   ├── processor/             # S3 event processor
│   └── uploader/              # Pre-signed URL generator
├── web/player-update/          # Frontend application
│   ├── Dockerfile
│   ├── nginx.conf
│   └── docker-compose.yml
├── ECR-VERSIONING.md          # Container versioning guide
└── README.md                  # This file
```

---

