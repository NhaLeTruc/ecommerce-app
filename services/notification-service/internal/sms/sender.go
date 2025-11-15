package sms

import (
	"fmt"

	"github.com/ecommerce/notification-service/internal/config"
	"go.uber.org/zap"
)

// SMSSender handles sending SMS messages
type SMSSender struct {
	config *config.Config
	logger *zap.Logger
}

// NewSMSSender creates a new SMS sender
func NewSMSSender(cfg *config.Config, logger *zap.Logger) *SMSSender {
	return &SMSSender{
		config: cfg,
		logger: logger,
	}
}

// Send sends an SMS message
func (s *SMSSender) Send(to string, message string) error {
	// In development mode or without Twilio credentials, simulate sending
	if s.config.Environment == "development" || s.config.TwilioAccountSID == "" {
		s.logger.Info("SMS (simulated)",
			zap.String("to", to),
			zap.String("message", message),
		)
		return nil
	}

	// Production mode: integrate with Twilio
	// Note: Full Twilio integration would require the Twilio SDK
	// For now, we'll log that we would send via Twilio
	s.logger.Info("SMS would be sent via Twilio",
		zap.String("to", to),
		zap.String("message", message),
		zap.String("account_sid", s.config.TwilioAccountSID),
	)

	// In a production implementation, you would use:
	// client := twilio.NewRestClient()
	// params := &twilioApi.CreateMessageParams{}
	// params.SetTo(to)
	// params.SetFrom(s.config.TwilioPhoneNumber)
	// params.SetBody(message)
	// resp, err := client.Api.CreateMessage(params)

	return nil
}

// SendBulk sends SMS to multiple recipients
func (s *SMSSender) SendBulk(recipients []string, message string) error {
	for _, recipient := range recipients {
		if err := s.Send(recipient, message); err != nil {
			s.logger.Error("Failed to send SMS",
				zap.String("recipient", recipient),
				zap.Error(err),
			)
			// Continue sending to other recipients
		}
	}
	return nil
}

// ValidatePhoneNumber validates a phone number format
func (s *SMSSender) ValidatePhoneNumber(phone string) error {
	// Basic validation - in production, use a proper phone validation library
	if len(phone) < 10 {
		return fmt.Errorf("phone number too short")
	}
	return nil
}
