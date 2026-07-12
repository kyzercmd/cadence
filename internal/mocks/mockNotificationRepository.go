package mocks

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
)

type MockNotificationRepository struct {
	MockReturnErr error
}

func (m *MockNotificationRepository) CreateNotification(ctx context.Context, payload *models.CreateNotificationPayload) error {
	return nil
}
func (m *MockNotificationRepository) GetMyNotifications(ctx context.Context, userID string, limit int) ([]*models.Notification, error) {
	return nil, nil
}
func (m *MockNotificationRepository) MarkAsRead(ctx context.Context, userID string, notificationID string) error {
	return nil
}
func (m *MockNotificationRepository) MarkAllAsRead(ctx context.Context, userID string) error {
	return nil
}
