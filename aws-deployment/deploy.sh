#!/bin/bash

# Time Tracker AWS Deployment Script
set -e

# Configuration
STACK_NAME="timetracker-infrastructure"
REGION="us-east-1"
ECR_REPOSITORY="timetracker-backend"
IMAGE_TAG="latest"

echo "🚀 Starting Time Tracker deployment to AWS..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 AWS Account ID: $ACCOUNT_ID"

# Step 1: Deploy CloudFormation stack
echo "📦 Deploying infrastructure with CloudFormation..."
aws cloudformation deploy \
    --template-file cloudformation-template.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        DBPassword=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25) \
    --capabilities CAPABILITY_IAM \
    --region $REGION

# Get stack outputs
echo "📋 Getting stack outputs..."
VPC_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`VPC`].OutputValue' \
    --output text \
    --region $REGION)

PRIVATE_SUBNETS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnets`].OutputValue' \
    --output text \
    --region $REGION)

TARGET_GROUP_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`TargetGroup`].OutputValue' \
    --output text \
    --region $REGION)

ECS_CLUSTER=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSCluster`].OutputValue' \
    --output text \
    --region $REGION)

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text \
    --region $REGION)

REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
    --output text \
    --region $REGION)

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`S3Bucket`].OutputValue' \
    --output text \
    --region $REGION)

echo "✅ Infrastructure deployed successfully!"
echo "   VPC ID: $VPC_ID"
echo "   Database Endpoint: $DB_ENDPOINT"
echo "   Redis Endpoint: $REDIS_ENDPOINT"
echo "   S3 Bucket: $S3_BUCKET"

# Step 2: Create ECR repository
echo "🐳 Creating ECR repository..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $REGION > /dev/null 2>&1 || \
aws ecr create-repository --repository-name $ECR_REPOSITORY --region $REGION

# Step 3: Build and push Docker image
echo "🔨 Building Docker image..."
cd ../backend

# Get ECR login token
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build image
docker build -t $ECR_REPOSITORY:$IMAGE_TAG .

# Tag image
docker tag $ECR_REPOSITORY:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

# Push image
echo "📤 Pushing Docker image to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

cd ../aws-deployment

# Step 4: Create Secrets Manager secrets
echo "🔐 Creating secrets in AWS Secrets Manager..."

# Generate Django secret key
DJANGO_SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')

# Create Django secret
aws secretsmanager create-secret \
    --name "timetracker/django-secret-key" \
    --description "Django secret key for Time Tracker" \
    --secret-string "$DJANGO_SECRET_KEY" \
    --region $REGION > /dev/null 2>&1 || \
aws secretsmanager update-secret \
    --secret-id "timetracker/django-secret-key" \
    --secret-string "$DJANGO_SECRET_KEY" \
    --region $REGION

# Create RDS credentials secret
RDS_SECRET=$(cat <<EOF
{
  "username": "postgres",
  "password": "$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)",
  "database": "timetracker",
  "host": "$DB_ENDPOINT",
  "port": "5432"
}
EOF
)

aws secretsmanager create-secret \
    --name "timetracker/rds-credentials" \
    --description "RDS credentials for Time Tracker" \
    --secret-string "$RDS_SECRET" \
    --region $REGION > /dev/null 2>&1 || \
aws secretsmanager update-secret \
    --secret-id "timetracker/rds-credentials" \
    --secret-string "$RDS_SECRET" \
    --region $REGION

echo "✅ Secrets created successfully!"

# Step 5: Update ECS task definition with actual values
echo "📝 Updating ECS task definition..."
sed -i.bak \
    -e "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" \
    -e "s/YOUR_REGION/$REGION/g" \
    ecs-task-definition.json

# Step 6: Register ECS task definition
echo "📋 Registering ECS task definition..."
TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definition.json \
    --region $REGION \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "✅ Task definition registered: $TASK_DEFINITION_ARN"

# Step 7: Create ECS service
echo "🚀 Creating ECS service..."

# Get security group for ECS tasks
ECS_SECURITY_GROUP=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=TimeTracker-ECS-SG" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $REGION)

# Create service
aws ecs create-service \
    --cluster $ECS_CLUSTER \
    --service-name timetracker-backend-service \
    --task-definition $TASK_DEFINITION_ARN \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SECURITY_GROUP],assignPublicIp=DISABLED}" \
    --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=timetracker-backend,containerPort=8000" \
    --region $REGION > /dev/null 2>&1 || \
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service timetracker-backend-service \
    --task-definition $TASK_DEFINITION_ARN \
    --region $REGION

echo "✅ ECS service created/updated successfully!"

# Step 8: Wait for service to be stable
echo "⏳ Waiting for ECS service to be stable..."
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services timetracker-backend-service \
    --region $REGION

# Step 9: Run database migrations
echo "🗄️ Running database migrations..."
TASK_ARN=$(aws ecs run-task \
    --cluster $ECS_CLUSTER \
    --task-definition $TASK_DEFINITION_ARN \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SECURITY_GROUP],assignPublicIp=DISABLED}" \
    --overrides '{"containerOverrides":[{"name":"timetracker-backend","command":["python","manage.py","migrate"]}]}' \
    --region $REGION \
    --query 'tasks[0].taskArn' \
    --output text)

echo "⏳ Waiting for migration task to complete..."
aws ecs wait tasks-stopped \
    --cluster $ECS_CLUSTER \
    --tasks $TASK_ARN \
    --region $REGION

# Step 10: Create superuser
echo "👤 Creating Django superuser..."
SUPERUSER_TASK_ARN=$(aws ecs run-task \
    --cluster $ECS_CLUSTER \
    --task-definition $TASK_DEFINITION_ARN \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SECURITY_GROUP],assignPublicIp=DISABLED}" \
    --overrides '{"containerOverrides":[{"name":"timetracker-backend","command":["python","manage.py","shell","-c","from employees.models import CustomUser; CustomUser.objects.create_superuser(\"admin@gmail.com\", \"admin\", \"admin@123\", first_name=\"Admin\", last_name=\"User\") if not CustomUser.objects.filter(email=\"admin@gmail.com\").exists() else None"]}]}' \
    --region $REGION \
    --query 'tasks[0].taskArn' \
    --output text)

aws ecs wait tasks-stopped \
    --cluster $ECS_CLUSTER \
    --tasks $SUPERUSER_TASK_ARN \
    --region $REGION

# Get ALB DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region $REGION)

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   Application URL: http://$ALB_DNS"
echo "   Admin Panel: http://$ALB_DNS/admin/"
echo "   API Base URL: http://$ALB_DNS/api/"
echo ""
echo "🔐 Default Admin Credentials:"
echo "   Email: admin@gmail.com"
echo "   Password: admin@123"
echo ""
echo "📚 Next Steps:"
echo "   1. Update your frontend to use the API URL: http://$ALB_DNS/api/"
echo "   2. Configure your domain name to point to: $ALB_DNS"
echo "   3. Set up SSL certificate for HTTPS"
echo "   4. Update CORS settings for your frontend domain"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs: aws logs tail /ecs/timetracker-backend --follow --region $REGION"
echo "   Scale service: aws ecs update-service --cluster $ECS_CLUSTER --service timetracker-backend-service --desired-count 2 --region $REGION"
echo ""