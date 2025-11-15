// Package otel provides OpenTelemetry instrumentation for Go services
package otel

import (
	"context"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// Config holds telemetry configuration
type Config struct {
	ServiceName    string
	ServiceVersion string
	Environment    string
	OtelEndpoint   string
	SampleRate     float64 // 0.0-1.0, default 1.0 (100%)
}

// InitTelemetry initializes OpenTelemetry tracing, metrics, and logging
// Returns a shutdown function that should be deferred
func InitTelemetry(ctx context.Context, cfg Config) (func(context.Context) error, error) {
	// TODO: Implement full telemetry initialization
	// 1. Create resource with service info
	// 2. Setup trace provider with OTLP exporter
	// 3. Setup metric provider with OTLP exporter
	// 4. Setup log provider
	// 5. Register global providers
	// 6. Set propagators (W3C Trace Context, Baggage)

	res, err := newResource(cfg)
	if err != nil {
		return nil, err
	}

	shutdownFuncs := []func(context.Context) error{}

	// Setup tracing
	tracerProvider, err := newTraceProvider(ctx, res, cfg)
	if err != nil {
		return nil, err
	}
	shutdownFuncs = append(shutdownFuncs, tracerProvider.Shutdown)
	otel.SetTracerProvider(tracerProvider)

	// Setup metrics
	meterProvider, err := newMeterProvider(ctx, res, cfg)
	if err != nil {
		return nil, err
	}
	shutdownFuncs = append(shutdownFuncs, meterProvider.Shutdown)
	otel.SetMeterProvider(meterProvider)

	// Setup propagation
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Return combined shutdown function
	return func(ctx context.Context) error {
		for _, fn := range shutdownFuncs {
			if err := fn(ctx); err != nil {
				return err
			}
		}
		return nil
	}, nil
}

func newResource(cfg Config) (*resource.Resource, error) {
	return resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceVersion(cfg.ServiceVersion),
			semconv.DeploymentEnvironment(cfg.Environment),
		),
	)
}

func newTraceProvider(ctx context.Context, res *resource.Resource, cfg Config) (*trace.TracerProvider, error) {
	// TODO: Implement trace provider with OTLP exporter
	exporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(cfg.OtelEndpoint),
		otlptracegrpc.WithInsecure(), // Use TLS in production
	)
	if err != nil {
		return nil, err
	}

	sampleRate := cfg.SampleRate
	if sampleRate == 0 {
		sampleRate = 1.0
	}

	return trace.NewTracerProvider(
		trace.WithBatcher(exporter),
		trace.WithResource(res),
		trace.WithSampler(trace.TraceIDRatioBased(sampleRate)),
	), nil
}

func newMeterProvider(ctx context.Context, res *resource.Resource, cfg Config) (*metric.MeterProvider, error) {
	// TODO: Implement meter provider with OTLP exporter
	exporter, err := otlpmetricgrpc.New(ctx,
		otlpmetricgrpc.WithEndpoint(cfg.OtelEndpoint),
		otlpmetricgrpc.WithInsecure(),
	)
	if err != nil {
		return nil, err
	}

	return metric.NewMeterProvider(
		metric.WithReader(metric.NewPeriodicReader(exporter,
			metric.WithInterval(10*time.Second),
		)),
		metric.WithResource(res),
	), nil
}

// ExtractCorrelationID extracts correlation ID from context
func ExtractCorrelationID(ctx context.Context) string {
	// TODO: Implement correlation ID extraction from baggage
	return ""
}

// InjectCorrelationID injects correlation ID into context
func InjectCorrelationID(ctx context.Context, correlationID string) context.Context {
	// TODO: Implement correlation ID injection into baggage
	return ctx
}
