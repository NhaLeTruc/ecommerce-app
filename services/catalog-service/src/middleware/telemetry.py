"""OpenTelemetry instrumentation"""
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.motor import MotorInstrumentor
from opentelemetry.instrumentation.aiohttp_client import AioHttpClientInstrumentor
import structlog

from ..config import settings

logger = structlog.get_logger(__name__)

_initialized = False


def init_telemetry():
    """Initialize OpenTelemetry instrumentation"""
    global _initialized

    if _initialized:
        logger.warning("Telemetry already initialized")
        return

    logger.info("Initializing OpenTelemetry", endpoint=settings.otlp_endpoint)

    # Create resource
    resource = Resource.create({
        SERVICE_NAME: "catalog-service",
        SERVICE_VERSION: "1.0.0",
        "environment": settings.environment,
    })

    # Setup tracing
    trace_provider = TracerProvider(resource=resource)
    otlp_trace_exporter = OTLPSpanExporter(
        endpoint=settings.otlp_endpoint,
        insecure=True,
    )
    trace_provider.add_span_processor(BatchSpanProcessor(otlp_trace_exporter))
    trace.set_tracer_provider(trace_provider)

    # Setup metrics
    otlp_metric_exporter = OTLPMetricExporter(
        endpoint=settings.otlp_endpoint,
        insecure=True,
    )
    metric_reader = PeriodicExportingMetricReader(otlp_metric_exporter, export_interval_millis=60000)
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Instrument libraries
    MotorInstrumentor().instrument()
    AioHttpClientInstrumentor().instrument()

    _initialized = True
    logger.info("OpenTelemetry initialized successfully")


def instrument_fastapi(app):
    """Instrument FastAPI application"""
    logger.info("Instrumenting FastAPI application")
    FastAPIInstrumentor.instrument_app(app)


def get_tracer(name: str):
    """Get tracer instance"""
    return trace.get_tracer(name)


def get_meter(name: str):
    """Get meter instance"""
    return metrics.get_meter(name)
