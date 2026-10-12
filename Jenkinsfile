// =============================================================================
// Skilli College DevOps & Cloud Lab - Student CI/CD Pipeline
// Flow: GitHub -> Jenkins -> SonarQube -> Docker Build -> Nexus -> K8s -> URL
//
// ⚡ GITHUB WEBHOOK SETUP FOR AUTO-DEPLOY ON "git push":
// 1. In your GitHub repo, go to: Settings -> Webhooks -> Add webhook
// 2. Payload URL: https://jenkins.imcc.skilli.in/github-webhook/  (Keep ending slash!)
// 3. Content type: application/json
// 4. Secret: <Leave Empty>
// 5. SSL verification: Enable SSL verification
// 6. Which events: Just the push event
// 7. Active: Checked [x]
// 8. Click "Add webhook" -> Now every "git push" triggers auto-deploy!
// =============================================================================

pipeline {
    agent any

    // Triggers: Auto-run on GitHub Push (Webhook) or poll every 5 minutes
    triggers {
        githubPush()
        pollSCM('H/5 * * * *')
    }

    environment {
        // =====================================================================
        // [STEP 1] STUDENT CONFIGURATION - FILL FROM YOUR WELCOME EMAIL
        // =====================================================================
        
        // 1. SonarQube Configuration (from email: SonarQube Project Key)
        SONAR_HOST_URL      = 'https://sonarqube.imcc.skilli.in'
        SONAR_PROJECT_KEY   = 'CHANGE_ME_SONAR_PROJECT_KEY'  // Example: 'mca-2401060-project'
        
        // 2. Nexus Docker Registry (from email: Docker Registry Path / Nexus URL)
        NEXUS_REGISTRY      = 'nexus.imcc.skilli.in'         // Registry host (without https://)
        NEXUS_REPO_PATH     = 'CHANGE_ME_NEXUS_IMAGE_PATH'   // Example: 'student-docker/mca-2401060'
        IMAGE_NAME          = 'my-app'                       // Your application name (lowercase)
        
        // 3. Kubernetes Environment (from email: Namespace)
        K8S_NAMESPACE       = 'CHANGE_ME_K8S_NAMESPACE'      // Example: 'student-mca-2401060'
        K8S_DEPLOYMENT_NAME = 'my-app-deployment'            // Matches name in k8s/deployment.yaml
        
        // =====================================================================
        // [STEP 2] JENKINS CREDENTIAL IDs (Created in Jenkins -> Credentials)
        // =====================================================================
        // Type: Secret text (contains your SonarQube Analysis Token: sqa_xxx)
        SONAR_CRED_ID       = 'sonar-token-student'
        
        // Type: Username with password (your student Nexus username & password)
        NEXUS_CRED_ID       = 'nexus-student-creds'
        
        // Type: Secret file (downloaded namespace-scoped kubeconfig from Admin Panel)
        KUBE_CRED_ID        = 'student-kubeconfig'

        // Dynamic Image Tag using short Git Commit hash
        IMAGE_TAG           = "${env.BUILD_NUMBER}-${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'latest'}"
        FULL_IMAGE          = "${env.NEXUS_REGISTRY}/${env.NEXUS_REPO_PATH}/${env.IMAGE_NAME}:${env.IMAGE_TAG}"
        LATEST_IMAGE        = "${env.NEXUS_REGISTRY}/${env.NEXUS_REPO_PATH}/${env.IMAGE_NAME}:latest"
    }

    stages {
        // ---------------------------------------------------------------------
        // STAGE 1: Code Checkout
        // ---------------------------------------------------------------------
        stage('1. Checkout Code') {
            steps {
                echo "🚀 Checking out source code from Git repository..."
                checkout scm
                script {
                    echo "Branch: ${env.GIT_BRANCH}"
                    echo "Commit: ${env.GIT_COMMIT}"
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 2: Dependency Installation & Automated Tests
        // ---------------------------------------------------------------------
        stage('2. Install & Test') {
            steps {
                echo "📦 Installing project dependencies and running tests..."
                sh '''
                    # For Node.js (uncomment if using Node.js)
                    if [ -f package.json ]; then
                        npm ci || npm install
                        npm test --if-present
                    fi

                    # For Python (uncomment if using Python)
                    # if [ -f requirements.txt ]; then
                    #     pip install -r requirements.txt
                    #     pytest || true
                    # fi
                '''
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 3: SonarQube Code Quality Analysis
        // ---------------------------------------------------------------------
        stage('3. SonarQube Analysis') {
            steps {
                echo "📊 Running SonarQube static code quality analysis..."
                withCredentials([string(credentialsId: env.SONAR_CRED_ID, variable: 'SONAR_TOKEN')]) {
                    sh """
                        # Run SonarScanner using Docker or local scanner CLI
                        if which sonar-scanner > /dev/null 2>&1; then
                            sonar-scanner \\
                                -Dsonar.host.url=${env.SONAR_HOST_URL} \\
                                -Dsonar.login=\${SONAR_TOKEN} \\
                                -Dsonar.projectKey=${env.SONAR_PROJECT_KEY} \\
                                -Dsonar.sources=. \\
                                -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/.git/**
                        else
                            echo "Using Dockerized sonar-scanner-cli..."
                            docker run --rm \\
                                -e SONAR_HOST_URL="${env.SONAR_HOST_URL}" \\
                                -e SONAR_SCANNER_OPTS="-Dsonar.projectKey=${env.SONAR_PROJECT_KEY}" \\
                                -e SONAR_TOKEN="\${SONAR_TOKEN}" \\
                                -v "\$(pwd):/usr/src" \\
                                sonarsource/sonar-scanner-cli \\
                                -Dsonar.projectKey=${env.SONAR_PROJECT_KEY} \\
                                -Dsonar.sources=. \\
                                -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/.git/** || true
                        fi
                    """
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 4: Docker Image Build
        // ---------------------------------------------------------------------
        stage('4. Docker Build') {
            steps {
                echo "🐳 Building Docker image: ${FULL_IMAGE}..."
                sh """
                    docker build -t ${FULL_IMAGE} -t ${LATEST_IMAGE} -f Dockerfile .
                """
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 5: Push to Private Nexus Registry
        // ---------------------------------------------------------------------
        stage('5. Push to Nexus') {
            steps {
                echo "📤 Authenticating and pushing Docker image to Nexus..."
                withCredentials([usernamePassword(credentialsId: env.NEXUS_CRED_ID, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASSWORD')]) {
                    sh """
                        echo "Logging into Nexus Docker registry: ${env.NEXUS_REGISTRY}..."
                        echo "\${NEXUS_PASSWORD}" | docker login -u "\${NEXUS_USER}" --password-stdin ${env.NEXUS_REGISTRY}
                        
                        echo "Pushing tagged image..."
                        docker push ${FULL_IMAGE}
                        docker push ${LATEST_IMAGE}
                        
                        echo "Cleaning up local build image cache..."
                        docker rmi ${FULL_IMAGE} ${LATEST_IMAGE} || true
                        docker logout ${env.NEXUS_REGISTRY} || true
                    """
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 6: Deploy to Student Kubernetes Namespace
        // ---------------------------------------------------------------------
        stage('6. Deploy to Kubernetes') {
            steps {
                echo "☸️ Applying Kubernetes manifests to namespace ${env.K8S_NAMESPACE}..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh """
                        export KUBECONFIG=\${KUBECONFIG_FILE}
                        
                        # 1. Update image in deployment.yaml dynamically or apply manifests
                        # Replace image placeholder with the newly built image tag
                        sed -i 's|image: .*|image: ${FULL_IMAGE}|g' k8s/deployment.yaml || true
                        
                        echo "Applying manifests..."
                        kubectl apply -f k8s/ -n ${env.K8S_NAMESPACE}
                        
                        echo "Explicitly triggering rolling deployment..."
                        kubectl set image deployment/${env.K8S_DEPLOYMENT_NAME} \
                            ${env.IMAGE_NAME}=${FULL_IMAGE} \
                            -n ${env.K8S_NAMESPACE} || true
                    """
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 7: Verify Rollout Status
        // ---------------------------------------------------------------------
        stage('7. Verify Rollout') {
            steps {
                echo "🔍 Verifying application rollout in Kubernetes..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh """
                        export KUBECONFIG=\${KUBECONFIG_FILE}
                        
                        echo "Checking deployment rollout status..."
                        kubectl rollout status deployment/${env.K8S_DEPLOYMENT_NAME} -n ${env.K8S_NAMESPACE} --timeout=120s
                        
                        echo "Displaying deployed pods and service status..."
                        kubectl get pods,svc,ingress -n ${env.K8S_NAMESPACE}
                    """
                }
            }
        }
    }

    post {
        success {
            echo "================================================================="
            echo "🎉 Pipeline completed successfully!"
            echo "Your application has been deployed and is live in namespace: ${env.K8S_NAMESPACE}"
            echo "Check your assigned HTTPS URL from your welcome email!"
            echo "================================================================="
        }
        failure {
            echo "================================================================="
            echo "❌ Pipeline failed! Please inspect the console logs above."
            echo "Common checklist:"
            echo "1. Did you replace all CHANGE_ME placeholders in Jenkinsfile and k8s/?"
            echo "2. Are the 3 Jenkins credentials (sonar-token-student, nexus-student-creds, student-kubeconfig) created?"
            echo "3. Does your Dockerfile build cleanly locally?"
            echo "================================================================="
        }
    }
}
