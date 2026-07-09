package logging

import (
	"context"
	"log/slog"
	"os"
)

var globalLogger *slog.Logger

func init() {
	SetupLogger("info", "json")
}

func SetupLogger(level, format string) {
	logLevel := slog.LevelInfo
	switch level {
	case "debug":
		logLevel = slog.LevelDebug
	case "info":
		logLevel = slog.LevelInfo
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	}

	var handler slog.Handler
	opts := &slog.HandlerOptions{
		Level: logLevel,
	}

	if format == "json" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	globalLogger = slog.New(handler)
}

func Info(msg string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.Info(msg, toAttrs(args)...)
	}
}

func Debug(msg string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.Debug(msg, toAttrs(args)...)
	}
}

func Warn(msg string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.Warn(msg, toAttrs(args)...)
	}
}

func Error(msg string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.Error(msg, toAttrs(args)...)
	}
}

func InfoContext(ctx context.Context, msg string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.InfoContext(ctx, msg, toAttrs(args)...)
	}
}

func ErrorContext(ctx context.Context, msg string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.ErrorContext(ctx, msg, toAttrs(args)...)
	}
}

func WithContext(ctx context.Context, args ...interface{}) context.Context {
	if globalLogger == nil {
		return ctx
	}
	return context.WithValue(ctx, "logger", globalLogger)
}

func toAttrs(args []interface{}) []slog.Attr {
	attrs := make([]slog.Attr, 0)
	for i := 0; i < len(args); i += 2 {
		if i+1 < len(args) {
			key := args[i].(string)
			value := args[i+1]
			attrs = append(attrs, slog.Any(key, value))
		}
	}
	return attrs
}
