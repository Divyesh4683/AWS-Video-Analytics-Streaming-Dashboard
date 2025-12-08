# 🚀 ECR Versioning Quick Commands

## 📦 **Create Your First Release**

```powershell
# 1. Ensure working directory is clean
git status

# 2. Create semantic version tag
git tag -a v1.0.0 -m "Initial production release with ECR versioning"

# 3. Push tag (triggers GitHub Actions)
git push origin v1.0.0

# 4. Watch deployment
# Go to: https://github.com/Divyesh4683/AWS-Video-Analytics-Streaming-Dashboard/actions
```

---

## 🔍 **Verify ECR Tags**

```powershell
# List all image tags
aws ecr list-images --repository-name video-analytics-frontend --region us-east-2 --query 'imageIds[*].imageTag' --output table

# Detailed view with timestamps
aws ecr describe-images --repository-name video-analytics-frontend --region us-east-2 --query 'imageDetails[*].[imageTags[0],imagePushedAt,imageSizeInBytes]' --output table

# Check specific version
aws ecr describe-images --repository-name video-analytics-frontend --region us-east-2 --image-ids imageTag=v1.0.0
```

---

## 🎯 **Apply ECR Lifecycle Policy**

```powershell
# Apply the lifecycle policy (auto-cleanup old dev images)
aws ecr put-lifecycle-policy --repository-name video-analytics-frontend --lifecycle-policy-text file://ecr-lifecycle-policy.json --region us-east-2

# Verify lifecycle policy
aws ecr get-lifecycle-policy --repository-name video-analytics-frontend --region us-east-2

# Preview what would be deleted (dry run)
aws ecr get-lifecycle-policy-preview --repository-name video-analytics-frontend --region us-east-2
```

---

## 📊 **View Current Deployment Version**

```powershell
# Check what version is running in Kubernetes
kubectl get deployment video-analytics-frontend -n video-analytics -o jsonpath='{.spec.template.spec.containers[0].image}'

# Detailed deployment info
kubectl describe deployment video-analytics-frontend -n video-analytics | Select-String "Image:"

# Check all pod images
kubectl get pods -n video-analytics -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'
```

---

## 🔄 **Rollback to Previous Version**

```powershell
# Rollback to v1.0.0
kubectl set image deployment/video-analytics-frontend video-analytics-frontend=418272773708.dkr.ecr.us-east-2.amazonaws.com/video-analytics-frontend:v1.0.0 -n video-analytics

# Verify rollout
kubectl rollout status deployment/video-analytics-frontend -n video-analytics

# Check rollout history
kubectl rollout history deployment/video-analytics-frontend -n video-analytics
```

---

## 🧹 **Manual Cleanup (if needed)**

```powershell
# Delete specific old dev tag
aws ecr batch-delete-image --repository-name video-analytics-frontend --region us-east-2 --image-ids imageTag=dev-20251201-abc1234

# Delete multiple tags at once
aws ecr batch-delete-image --repository-name video-analytics-frontend --region us-east-2 --image-ids imageTag=dev-20251201-abc1234 imageTag=dev-20251202-def5678
```

---

## 🏷️ **Tagging Best Practices**

```powershell
# Feature release (backward compatible)
git tag v1.1.0 -m "Added video upload progress indicator"
git push origin v1.1.0

# Bug fix
git tag v1.0.1 -m "Fixed nginx connection timeout"
git push origin v1.0.1

# Breaking change
git tag v2.0.0 -m "Changed API response format (breaking)"
git push origin v2.0.0

# Pre-release (testing)
git tag v1.2.0-beta.1 -m "Beta release for testing"
git push origin v1.2.0-beta.1
```

---

## 📸 **Screenshot Commands for Documentation**

```powershell
# 1. ECR Repository with multiple tags
aws ecr describe-images --repository-name video-analytics-frontend --region us-east-2 --query 'imageDetails[*].[imageTags[0],imagePushedAt]' --output table

# 2. Lifecycle policy
aws ecr get-lifecycle-policy --repository-name video-analytics-frontend --region us-east-2

# 3. Current deployment version
kubectl describe deployment video-analytics-frontend -n video-analytics | Select-String "Image:"

# 4. GitHub Actions successful build with version tags
# Navigate to: Actions > Deploy to EKS > Latest run > Push to ECR step
```

---

## 🎓 **For Your Professor**

**What changed:**
- ✅ Semantic versioning (v1.0.0, v1.1.0, etc.)
- ✅ Multi-tag strategy (version + SHA + latest)
- ✅ Automated tag generation in CI/CD
- ✅ ECR lifecycle policy for cleanup
- ✅ Full traceability (git SHA → ECR image)

**Evidence to collect:**
1. ECR Console showing multiple tags per image
2. GitHub Actions log showing version generation
3. `kubectl describe` showing semantic version in deployment
4. ECR lifecycle policy JSON

---

**Next Step:** Run the first command to create v1.0.0 tag! 🚀
