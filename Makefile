.PHONY: help setup dev clean build test test-coverage lint format docker-up docker-down docker-logs seed migrate migrate-rollback validate security-scan

# Ecommerce Platform - Makefile
# Common development and operations commands

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(CYAN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development Environment

setup: ## Initial project setup (run once)
	@echo "$(GREEN)Setting up development environment...$(NC)"
	@chmod +x scripts/setup-dev.sh
	@./scripts/setup-dev.sh

dev: ## Start development environment
	@echo "$(GREEN)Starting development environment...$(NC)"
	@cd infrastructure/docker-compose && docker-compose up -d
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "$(CYAN)Services available at:$(NC)"
	@echo "  - Kong API Gateway:    http://localhost:8000"
	@echo "  - PostgreSQL:          localhost:5432"
	@echo "  - MongoDB:             localhost:27017"
	@echo "  - Redis:               localhost:6379"
	@echo "  - Kafka:               localhost:9093"
	@echo "  - Prometheus:          http://localhost:9090"
	@echo "  - Grafana:             http://localhost:3000"
	@echo "  - Jaeger UI:           http://localhost:16686"
	@echo "  - Adminer:             http://localhost:8080"
	@echo "  - MailHog:             http://localhost:8025"

dev-stop: ## Stop development environment
	@echo "$(YELLOW)Stopping development environment...$(NC)"
	@cd infrastructure/docker-compose && docker-compose stop

dev-down: ## Stop and remove development environment
	@echo "$(RED)Removing development environment...$(NC)"
	@cd infrastructure/docker-compose && docker-compose down

dev-restart: dev-down dev ## Restart development environment

##@ Docker Operations

docker-up: ## Start all Docker services
	@cd infrastructure/docker-compose && docker-compose up -d

docker-down: ## Stop and remove all Docker containers
	@cd infrastructure/docker-compose && docker-compose down

docker-down-volumes: ## Stop and remove all Docker containers and volumes (DESTRUCTIVE)
	@echo "$(RED)WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? (y/N) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd infrastructure/docker-compose && docker-compose down -v; \
	fi

docker-logs: ## Tail logs from all Docker services
	@cd infrastructure/docker-compose && docker-compose logs -f

docker-logs-%: ## Tail logs from specific service (e.g., make docker-logs-postgres)
	@cd infrastructure/docker-compose && docker-compose logs -f $*

docker-ps: ## Show running Docker containers
	@cd infrastructure/docker-compose && docker-compose ps

docker-restart: docker-down docker-up ## Restart all Docker services

##@ Database Operations

migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	@echo "TODO: Add migration commands for each service"
	# @cd services/catalog-service && python -m alembic upgrade head
	# @cd services/inventory-service && migrate -path migrations -database "$(DATABASE_URL)" up

migrate-rollback: ## Rollback last database migration
	@echo "$(YELLOW)Rolling back database migrations...$(NC)"
	@echo "TODO: Add rollback commands for each service"
	# @cd services/catalog-service && python -m alembic downgrade -1

migrate-create: ## Create a new migration (usage: make migrate-create name=add_users_table)
	@echo "$(GREEN)Creating new migration: $(name)$(NC)"
	@echo "TODO: Add migration creation commands"

seed: ## Seed database with test data
	@echo "$(GREEN)Seeding database...$(NC)"
	@chmod +x scripts/seed-data.sh
	@./scripts/seed-data.sh

db-console-postgres: ## Open PostgreSQL console
	@docker exec -it ecommerce-postgres psql -U ecommerce -d ecommerce

db-console-mongo: ## Open MongoDB console
	@docker exec -it ecommerce-mongodb mongosh -u ecommerce -p dev_password --authenticationDatabase admin catalog

db-console-redis: ## Open Redis console
	@docker exec -it ecommerce-redis redis-cli -a dev_password

##@ Build & Test

build: ## Build all services
	@echo "$(GREEN)Building all services...$(NC)"
	@echo "Building Go services..."
	@for service in services/*-service/; do \
		if [ -f "$$service/go.mod" ]; then \
			echo "  - Building $$service"; \
			cd $$service && go build -o bin/service ./cmd/server; \
			cd -; \
		fi; \
	done
	@echo "Building Node.js services..."
	@for service in services/*-service/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "  - Building $$service"; \
			cd $$service && npm run build; \
			cd -; \
		fi; \
	done
	@echo "Building Python services..."
	@for service in services/*-service/; do \
		if [ -f "$$service/requirements.txt" ]; then \
			echo "  - Building $$service"; \
			cd $$service && pip install -r requirements.txt; \
			cd -; \
		fi; \
	done
	@echo "$(GREEN)Build complete!$(NC)"

test: ## Run all tests
	@echo "$(GREEN)Running all tests...$(NC)"
	@$(MAKE) test-go
	@$(MAKE) test-node
	@$(MAKE) test-python
	@echo "$(GREEN)All tests passed!$(NC)"

test-go: ## Run Go tests
	@echo "Running Go tests..."
	@for service in services/*-service/; do \
		if [ -f "$$service/go.mod" ]; then \
			echo "  Testing $$service"; \
			cd $$service && go test ./... -v; \
			cd -; \
		fi; \
	done

test-node: ## Run Node.js tests
	@echo "Running Node.js tests..."
	@for service in services/*-service/; do \
		if [ -f "$$service/package.json" ]; then \
			echo "  Testing $$service"; \
			cd $$service && npm test; \
			cd -; \
		fi; \
	done

test-python: ## Run Python tests
	@echo "Running Python tests..."
	@for service in services/*-service/; do \
		if [ -f "$$service/requirements.txt" ]; then \
			echo "  Testing $$service"; \
			cd $$service && pytest; \
			cd -; \
		fi; \
	done

test-coverage: ## Run tests with coverage
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	@for service in services/*-service/; do \
		if [ -f "$$service/go.mod" ]; then \
			cd $$service && go test -cover ./...; cd -; \
		elif [ -f "$$service/package.json" ]; then \
			cd $$service && npm run test:coverage; cd -; \
		elif [ -f "$$service/pytest.ini" ]; then \
			cd $$service && pytest --cov; cd -; \
		fi; \
	done

test-e2e: ## Run end-to-end tests
	@echo "$(GREEN)Running E2E tests...$(NC)"
	@cd tests/e2e && npx playwright test

test-contract: ## Run contract tests
	@echo "$(GREEN)Running contract tests...$(NC)"
	@cd tests/contract && npm test

test-load: ## Run load tests
	@echo "$(GREEN)Running load tests...$(NC)"
	@cd tests/load && k6 run load-test.js

##@ Code Quality

lint: ## Run linters
	@echo "$(GREEN)Running linters...$(NC)"
	@$(MAKE) lint-go
	@$(MAKE) lint-node
	@$(MAKE) lint-python

lint-go: ## Lint Go code
	@echo "Linting Go code..."
	@for service in services/*-service/; do \
		if [ -f "$$service/go.mod" ]; then \
			cd $$service && golangci-lint run ./...; cd -; \
		fi; \
	done

lint-node: ## Lint Node.js code
	@echo "Linting Node.js code..."
	@for service in services/*-service/ frontend/*/; do \
		if [ -f "$$service/package.json" ]; then \
			cd $$service && npm run lint; cd -; \
		fi; \
	done

lint-python: ## Lint Python code
	@echo "Linting Python code..."
	@for service in services/*-service/; do \
		if [ -f "$$service/requirements.txt" ]; then \
			cd $$service && pylint src/; cd -; \
		fi; \
	done

format: ## Format code
	@echo "$(GREEN)Formatting code...$(NC)"
	@for service in services/*-service/; do \
		if [ -f "$$service/go.mod" ]; then \
			cd $$service && gofmt -w .; cd -; \
		elif [ -f "$$service/package.json" ]; then \
			cd $$service && npm run format; cd -; \
		elif [ -f "$$service/setup.py" ]; then \
			cd $$service && black src/; cd -; \
		fi; \
	done

validate: lint test ## Run linters and tests (pre-commit validation)
	@echo "$(GREEN)✓ All validation checks passed!$(NC)"

##@ Security

security-scan: ## Run security scans
	@echo "$(GREEN)Running security scans...$(NC)"
	@chmod +x scripts/validate-constitution.sh
	@./scripts/validate-constitution.sh
	@echo "Running Trivy vulnerability scan..."
	@trivy fs . --severity HIGH,CRITICAL
	@echo "Checking for secrets..."
	@docker run --rm -v $(PWD):/src trufflesecurity/trufflehog:latest filesystem /src

##@ Observability

logs-tail: ## Tail application logs
	@docker-compose -f infrastructure/docker-compose/docker-compose.yml logs -f

metrics: ## Open Prometheus metrics
	@open http://localhost:9090 2>/dev/null || xdg-open http://localhost:9090 2>/dev/null || echo "Open http://localhost:9090"

dashboards: ## Open Grafana dashboards
	@open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || echo "Open http://localhost:3000"

traces: ## Open Jaeger tracing UI
	@open http://localhost:16686 2>/dev/null || xdg-open http://localhost:16686 2>/dev/null || echo "Open http://localhost:16686"

##@ Utility

clean: ## Clean build artifacts and caches
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@find . -type d -name "node_modules" -prune -exec rm -rf {} \;
	@find . -type d -name "dist" -exec rm -rf {} \;
	@find . -type d -name "build" -exec rm -rf {} \;
	@find . -type d -name "__pycache__" -exec rm -rf {} \;
	@find . -type d -name ".pytest_cache" -exec rm -rf {} \;
	@find . -type d -name "coverage" -exec rm -rf {} \;
	@find . -type f -name "*.pyc" -delete
	@find . -type f -name "*.log" -delete
	@echo "$(GREEN)Clean complete!$(NC)"

reset: clean docker-down-volumes setup dev seed ## Full reset (DESTRUCTIVE - deletes all data)
	@echo "$(GREEN)Environment reset complete!$(NC)"

status: ## Show status of all services
	@echo "$(CYAN)Infrastructure Status:$(NC)"
	@cd infrastructure/docker-compose && docker-compose ps
	@echo "\n$(CYAN)Health Checks:$(NC)"
	@curl -s http://localhost:8000/health 2>/dev/null && echo "✓ Kong API Gateway" || echo "✗ Kong API Gateway"
	@curl -s http://localhost:9090/-/healthy 2>/dev/null && echo "✓ Prometheus" || echo "✗ Prometheus"
	@curl -s http://localhost:3000/api/health 2>/dev/null && echo "✓ Grafana" || echo "✗ Grafana"

install-tools: ## Install required development tools
	@echo "$(GREEN)Installing development tools...$(NC)"
	@echo "Installing Go tools..."
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install github.com/google/wire/cmd/wire@latest
	@echo "Installing Node.js tools..."
	@npm install -g @playwright/test
	@npm install -g pact
	@echo "Installing Python tools..."
	@pip install black pylint pytest pytest-cov
	@echo "$(GREEN)Tools installed!$(NC)"

##@ Documentation

docs: ## Generate documentation
	@echo "$(GREEN)Generating documentation...$(NC)"
	@echo "TODO: Add documentation generation commands"

api-docs: ## Generate API documentation
	@echo "$(GREEN)Generating API documentation...$(NC)"
	@echo "TODO: Add OpenAPI/Swagger generation"

.DEFAULT_GOAL := help
