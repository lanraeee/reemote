.PHONY: help setup db-up db-down migrate test build run clean lint

help:
	@echo "Reemote - Remote Desktop VM Tool"
	@echo ""
	@echo "Available commands:"
	@echo "  make setup        - Install dependencies"
	@echo "  make db-up        - Start PostgreSQL"
	@echo "  make db-down      - Stop PostgreSQL"
	@echo "  make migrate      - Run database migrations"
	@echo "  make run          - Run backend server"
	@echo "  make build        - Build backend binary"
	@echo "  make test         - Run tests"
	@echo "  make lint         - Run linters"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run with Docker Compose"

setup:
	cd backend && go mod download

db-up:
	docker-compose up -d postgres

db-down:
	docker-compose down postgres

migrate:
	psql -h localhost -U reemote -d reemote -f backend/migrations/001_create_tables.sql

run: db-up
	cd backend && go run ./cmd/server/main.go

build:
	cd backend && CGO_ENABLED=0 go build -o ../bin/reemote-server ./cmd/server

test:
	cd backend && go test -v ./...

lint:
	cd backend && golangci-lint run ./...

clean:
	rm -rf bin/

docker-build:
	docker-compose build

docker-run:
	docker-compose up

docker-logs:
	docker-compose logs -f backend

.PHONY: help setup db-up db-down migrate run build test lint clean docker-build docker-run docker-logs
