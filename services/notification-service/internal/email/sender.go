package email

import (
	"bytes"
	"fmt"
	"html/template"

	"github.com/ecommerce/notification-service/internal/config"
	"go.uber.org/zap"
	gomail "gopkg.in/gomail.v2"
)

// EmailSender handles email sending
type EmailSender struct {
	config *config.Config
	logger *zap.Logger
	dialer *gomail.Dialer
}

// NewEmailSender creates a new email sender
func NewEmailSender(cfg *config.Config, logger *zap.Logger) *EmailSender {
	dialer := gomail.NewDialer(
		cfg.SMTPHost,
		cfg.SMTPPort,
		cfg.SMTPUsername,
		cfg.SMTPPassword,
	)

	return &EmailSender{
		config: cfg,
		logger: logger,
		dialer: dialer,
	}
}

// Email represents an email message
type Email struct {
	To      string
	Subject string
	Body    string
	IsHTML  bool
}

// Send sends an email
func (s *EmailSender) Send(email Email) error {
	s.logger.Info("Sending email",
		zap.String("to", email.To),
		zap.String("subject", email.Subject),
	)

	// In development mode, just log instead of sending
	if s.config.Environment == "development" || s.config.SMTPUsername == "" {
		s.logger.Info("Email (simulated)",
			zap.String("to", email.To),
			zap.String("subject", email.Subject),
			zap.String("body_preview", truncate(email.Body, 100)),
		)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail))
	m.SetHeader("To", email.To)
	m.SetHeader("Subject", email.Subject)

	if email.IsHTML {
		m.SetBody("text/html", email.Body)
	} else {
		m.SetBody("text/plain", email.Body)
	}

	if err := s.dialer.DialAndSend(m); err != nil {
		s.logger.Error("Failed to send email",
			zap.String("to", email.To),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("Email sent successfully", zap.String("to", email.To))
	return nil
}

// SendFromTemplate sends an email using a template
func (s *EmailSender) SendFromTemplate(to, subject, templateName string, data interface{}) error {
	tmpl, err := template.ParseFiles(fmt.Sprintf("internal/templates/%s.html", templateName))
	if err != nil {
		s.logger.Error("Failed to parse template",
			zap.String("template", templateName),
			zap.Error(err),
		)
		return err
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		s.logger.Error("Failed to execute template",
			zap.String("template", templateName),
			zap.Error(err),
		)
		return err
	}

	return s.Send(Email{
		To:      to,
		Subject: subject,
		Body:    body.String(),
		IsHTML:  true,
	})
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
