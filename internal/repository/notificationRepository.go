package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kyzercmd/cadence/internal/models"
)

type NotificationRepository interface {
	CreateNotification(ctx context.Context, payload *models.CreateNotificationPayload) error
	GetMyNotifications(ctx context.Context, userID string, limit int) ([]*models.Notification, error)
	MarkAsRead(ctx context.Context, userID string, notificationID string) error
	MarkAllAsRead(ctx context.Context, userID string) error
}

type postgresNotificationRepository struct {
	db *pgxpool.Pool
}

func NewNotificationRepository(db *pgxpool.Pool) NotificationRepository {
	return &postgresNotificationRepository{db: db}
}

func (r *postgresNotificationRepository) CreateNotification(ctx context.Context, payload *models.CreateNotificationPayload) error {
	query := `
			INSERT INTO notifications (user_id, title, body)
			VALUES($1, $2, $3)
			`
	_, err := r.db.Exec(ctx, query, payload.UserID, payload.Title, payload.Body)
	if err != nil {
		return err
	}
	return nil
}

func (r *postgresNotificationRepository) GetMyNotifications(ctx context.Context, userID string, limit int) ([]*models.Notification, error) {
	query := `
			SELECT id, user_id, title, body, created_at, read 
			FROM notifications
			WHERE user_id = $1
			ORDER BY created_at DESC
			LIMIT $2 
			`
	rows, err := r.db.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifs := make([]*models.Notification, 0)
	for rows.Next() {
		var n models.Notification

		err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Body, &n.CreatedAt, &n.Read)
		if err != nil {
			return nil, err
		}

		notifs = append(notifs, &n)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return notifs, nil
}

func (r *postgresNotificationRepository) MarkAsRead(ctx context.Context, userID string, notificationID string) error {
	query := `
			UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2
			`
	_, err := r.db.Exec(ctx, query, notificationID, userID)
	return err
}

func (r *postgresNotificationRepository) MarkAllAsRead(ctx context.Context, userID string) error {
	query := `
			UPDATE notifications SET read = true WHERE user_id = $1 AND read = false
			`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}
