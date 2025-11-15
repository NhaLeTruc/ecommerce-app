// Package errors provides standardized error handling for Go services
package errors

import (
	"fmt"
	"net/http"
)

// AppError represents an application error with HTTP status code
type AppError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	StatusCode int    `json:"-"`
	Internal   error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Internal != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Internal)
	}
	return e.Message
}

// Common error constructors
func NewBadRequest(message string) *AppError {
	return &AppError{Code: "BAD_REQUEST", Message: message, StatusCode: http.StatusBadRequest}
}

func NewNotFound(resource string) *AppError {
	return &AppError{Code: "NOT_FOUND", Message: fmt.Sprintf("%s not found", resource), StatusCode: http.StatusNotFound}
}

func NewUnauthorized(message string) *AppError {
	return &AppError{Code: "UNAUTHORIZED", Message: message, StatusCode: http.StatusUnauthorized}
}

func NewForbidden(message string) *AppError {
	return &AppError{Code: "FORBIDDEN", Message: message, StatusCode: http.StatusForbidden}
}

func NewInternal(err error) *AppError {
	return &AppError{Code: "INTERNAL_ERROR", Message: "Internal server error", StatusCode: http.StatusInternalServerError, Internal: err}
}

func NewConflict(message string) *AppError {
	return &AppError{Code: "CONFLICT", Message: message, StatusCode: http.StatusConflict}
}
