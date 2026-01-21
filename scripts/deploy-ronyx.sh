#!/usr/bin/env bash
set -euo pipefail

echo "Deploying Ronyx web container..."
docker build -f docker/ronyx.Dockerfile -t ronyx.movearoundtms.com/web:latest .
docker push ronyx.movearoundtms.com/web:latest

echo "Applying Kubernetes manifests..."
kubectl apply -f k8s/ronyx/ronyx-deployment.yaml
