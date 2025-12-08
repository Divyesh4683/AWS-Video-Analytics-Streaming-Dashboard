# Amazon ECR Image Versioning Strategy

## 📦 **Current Implementation**

### **Multi-Tag Strategy**
Every image build creates **3 tags** for maximum traceability:

```
418272773708.dkr.ecr.us-east-2.amazonaws.com/video-analytics-frontend:
  ├── v1-video-analytics     (production release version 1)
  ├── v2-video-analytics     (production release version 2)
  ├── dev-20251208-6e81d6e   (dev builds with timestamp + short SHA)
  └── latest                 (always points to most recent build)
```

---

## 🎯 **Versioning Behavior**

### **Production Releases (Git Tags)**
When you create a git tag with your naming convention:
```bash
git tag v1-video-analytics
git push origin v1-video-analytics
```

**Resulting ECR tags:**
- `v1-video-analytics` - Production release version 1
- `6e81d6eee78f5a3b9c4d2e1f0a7b8c9d` - Git SHA (full traceability)
- `latest` - Points to this build

### **Development Builds (Branch Commits)**
For regular commits on feature branches:
```bash
git commit -m "Add new feature"
git push
```

**Resulting ECR tags:**
- `dev-20251208-6e81d6e` - Timestamp + short SHA
- `6e81d6eee78f5a3b9c4d2e1f0a7b8c9d` - Full git SHA
- `latest` - Points to this build

---

## 🔄 **Workflow Changes**

### **1. Version Generation Step**
```yaml
- name: Generate version tags
  id: version
  run: |
    if [[ "${{ github.ref }}" == refs/tags/v* ]]; then
      VERSION="${GITHUB_REF#refs/tags/}"
      echo "version=$VERSION" >> $GITHUB_OUTPUT
      echo "is_release=true" >> $GITHUB_OUTPUT
    else
      VERSION="dev-$(date +'%Y%m%d')-$(echo ${{ github.sha }} | cut -c1-7)"
      echo "version=$VERSION" >> $GITHUB_OUTPUT
      echo "is_release=false" >> $GITHUB_OUTPUT
    fi
```

### **2. Multi-Tag Docker Build**
```yaml
- name: Build Docker image
  run: |
    docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$VERSION \
                 -t $ECR_REGISTRY/$ECR_REPOSITORY:$SHORT_SHA \
                 -t $ECR_REGISTRY/$ECR_REPOSITORY:latest .
```

### **3. Push All Tags**
```yaml
- name: Push to ECR
  run: |
    docker push $ECR_REGISTRY/$ECR_REPOSITORY:$VERSION
    docker push $ECR_REGISTRY/$ECR_REPOSITORY:$SHORT_SHA
    docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
```

---

## 📋 **Semantic Versioning Guide**

Follow [SemVer 2.0.0](https://semver.org/):

### **Version Format: `MAJOR.MINOR.PATCH`**

| Type | When to Increment | Example |
|------|------------------|---------|
| **MAJOR** | Breaking changes | `v1.0.0` → `v2.0.0` |
| **MINOR** | New features (backward compatible) | `v1.2.0` → `v1.3.0` |
| **PATCH** | Bug fixes | `v1.2.3` → `v1.2.4` |

### **Common Scenarios**

#### **Initial Release**
```bash
git tag v1.0.0
git push origin v1.0.0
```

#### **Feature Addition**
```bash
# Added video upload progress bar
git tag v1.1.0
git push origin v1.1.0
```

#### **Bug Fix**
```bash
# Fixed nginx connection timeout
git tag v1.1.1
git push origin v1.1.1
```

#### **Breaking Change**
```bash
# Changed API response format
git tag v2.0.0
git push origin v2.0.0
```

---

## 🔍 **ECR Tag Management**

### **View All Image Tags**
```bash
aws ecr list-images \
  --repository-name video-analytics-frontend \
  --region us-east-2 \
  --query 'imageIds[*].imageTag' \
  --output table
```

### **View Image Details**
```bash
aws ecr describe-images \
  --repository-name video-analytics-frontend \
  --region us-east-2 \
  --image-ids imageTag=v1-video-analytics
```

### **Delete Old Development Tags** (Keep last 10)
```bash
# List tags sorted by push time
aws ecr describe-images \
  --repository-name video-analytics-frontend \
  --region us-east-2 \
  --query 'sort_by(imageDetails,& imagePushedAt)[*].imageTags[0]' \
  --output table

# Delete specific tag
aws ecr batch-delete-image \
  --repository-name video-analytics-frontend \
  --region us-east-2 \
  --image-ids imageTag=dev-20251201-abc1234
```

---

## 🎓 **Benefits of This Approach**

### **1. Traceability**
- **Git SHA tag**: Exact source code version
- **Semantic version**: Human-readable release number
- **Timestamp tag**: Know when dev builds were created

### **2. Rollback Capability**
```bash
# Rollback to specific version
kubectl set image deployment/video-analytics-frontend \
  video-analytics-frontend=418272773708.dkr.ecr.us-east-2.amazonaws.com/video-analytics-frontend:v1-video-analytics \
  -n video-analytics
```

### **3. Environment Promotion**
```bash
# Dev: Use timestamp tags
image: 418272773708.dkr.ecr.us-east-2.amazonaws.com/video-analytics-frontend:dev-20251208-6e81d6e

# Staging: Test before production
image: 418272773708.dkr.ecr.us-east-2.amazonaws.com/video-analytics-frontend:v2-video-analytics

# Production: Use stable versions
image: 418272773708.dkr.ecr.us-east-2.amazonaws.com/video-analytics-frontend:v1-video-analytics
```

### **4. Compliance & Audit**
- Every production image has a semantic version
- Git SHA allows complete audit trail back to source
- Timestamps show deployment chronology

---

## 🚀 **Quick Start: Creating Your First Release**

### **Step 1: Ensure code is ready**
```bash
git status
git log --oneline -5
```

### **Step 2: Create version tag**
```bash
git tag -a v1-video-analytics -m "Initial production release"
```

### **Step 3: Push tag to trigger CI/CD**
```bash
git push origin v1-video-analytics
```

### **Step 4: Monitor GitHub Actions**
- Go to **Actions** tab
- Watch `Deploy to EKS` workflow
- Verify image is built with tags: `v1-video-analytics`, `6e81d6e...`, `latest`

### **Step 5: Verify in ECR**
```bash
aws ecr describe-images \
  --repository-name video-analytics-frontend \
  --region us-east-2 \
  --image-ids imageTag=v1-video-analytics
```

### **Step 6: Confirm deployment**
```bash
kubectl describe deployment video-analytics-frontend -n video-analytics | grep Image:
```

---

## 📊 **Tag Naming Examples**

| Scenario | Git Action | ECR Tags Generated |
|----------|-----------|-------------------|
| Initial release | `git tag v1-video-analytics` | `v1-video-analytics`, `6e81d6e...`, `latest` |
| Major update | `git tag v2-video-analytics` | `v2-video-analytics`, `abc1234...`, `latest` |
| Feature branch commit | `git push` | `dev-20251208-def5678`, `def5678...`, `latest` |
| Next version | `git tag v3-video-analytics` | `v3-video-analytics`, `ghi9012...`, `latest` |

---

## ⚠️ **Best Practices**

### **DO:**
✅ Use v1-video-analytics, v2-video-analytics, etc. for production releases  
✅ Keep `latest` tag pointing to most recent stable build  
✅ Document major changes in CHANGELOG.md  
✅ Test images in dev/staging before tagging for production  
✅ Clean up old dev tags periodically (keep last 10-20)

### **DON'T:**
❌ Don't use `latest` in production deployments (use specific versions)  
❌ Don't reuse version tags (create new version number instead)  
❌ Don't skip versions in sequence (v1 → v3, use v2)  
❌ Don't delete production version tags from ECR  

---

## 🔧 **ECR Lifecycle Policy** (Recommended)

Create lifecycle policy to auto-cleanup old dev images:

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 dev images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["dev-"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Keep all production version tags (v*-video-analytics)",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["v"],
        "countType": "imageCountMoreThan",
        "countNumber": 999
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

Apply with:
```bash
aws ecr put-lifecycle-policy \
  --repository-name video-analytics-frontend \
  --lifecycle-policy-text file://ecr-lifecycle-policy.json \
  --region us-east-2
```

---

## 📈 **Current Tag Status**

Run this to see your current tags:
```bash
aws ecr describe-images \
  --repository-name video-analytics-frontend \
  --region us-east-2 \
  --query 'imageDetails[*].[imageTags[0],imagePushedAt,imageSizeInBytes]' \
  --output table
```

---

## 🎯 **Next Steps**

1. ✅ **Commit workflow changes**
2. 🏷️ **Create your first semantic version tag**: `git tag v1.0.0`
3. 🚀 **Push tag to trigger pipeline**: `git push origin v1.0.0`
4. 🔍 **Verify ECR tags**: Check AWS Console or CLI
5. 📝 **Update DELIVERABLES.md** with versioning strategy
6. 🧹 **Set up ECR lifecycle policy** for automatic cleanup

---

**You now have enterprise-grade image versioning! 🎉**
