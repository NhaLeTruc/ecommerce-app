# Shared OpenTelemetry Instrumentation (Go)

Provides common OpenTelemetry setup and utilities for Go services.

## Usage

```go
import "github.com/ecommerce-platform/shared/go/otel"

func main() {
    // Initialize telemetry
    shutdown, err := otel.InitTelemetry(context.Background(), otel.Config{
        ServiceName: "checkout-service",
        ServiceVersion: "1.0.0",
        Environment: "production",
        OtelEndpoint: "http://otel-collector:4317",
    })
    if err != nil {
        log.Fatal(err)
    }
    defer shutdown(context.Background())

    // Telemetry is now active globally
    // Use OpenTelemetry APIs for tracing, metrics, and logs
}
```

## Features

- Automatic trace, metric, and log setup
- Correlation ID propagation
- Resource detection (container, k8s, cloud)
- Graceful shutdown

## Implementation Status

⚠️ **SKELETON**: Core structure defined. Implement when services are created.
