FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o reemote-server ./cmd/server

FROM alpine:latest

RUN apk --no-cache add ca-certificates postgresql-client

WORKDIR /app

COPY --from=builder /app/reemote-server .
COPY --from=builder /app/backend/migrations ./migrations

EXPOSE 8443

CMD ["./reemote-server"]
