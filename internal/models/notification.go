package models

import "time"

type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"createdAt"`
	Read      bool      `json:"read"`
}

type CreateNotificationPayload struct {
	UserID string
	Title  string
	Body   string
}
