package service

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
)

type NotificationService interface {
	CreateNotification(ctx context.Context, payload *models.CreateNotificationPayload) error

	GetMyNotifications(ctx context.Context, userID string, limit int) ([]*models.Notification, error)
	MarkAsRead(ctx context.Context, notificationID string, userID string) error
	MarkAllAsRead(ctx context.Context, userID string) error
}

type notificationService struct {
	repo repository.NotificationRepository
}

func NewNotificationService(repo repository.NotificationRepository) NotificationService {
	return &notificationService{repo: repo}
}

func (s *notificationService) CreateNotification(ctx context.Context, payload *models.CreateNotificationPayload) error {
	return s.repo.CreateNotification(ctx, payload)
}

func (s *notificationService) GetMyNotifications(ctx context.Context, userID string, limit int) ([]*models.Notification, error) {
	return s.repo.GetMyNotifications(ctx, userID, limit)
}

func (s *notificationService) MarkAsRead(ctx context.Context, notificationID string, userID string) error {
	return s.repo.MarkAsRead(ctx, notificationID, userID)
}

func (s *notificationService) MarkAllAsRead(ctx context.Context, userID string) error {
	return s.repo.MarkAllAsRead(ctx, userID)
}
