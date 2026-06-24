package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kyzercmd/cadence/internal/models"
)

type LeaveRepository interface {
	CreateLeaveRequest(ctx context.Context, userID string, payload *models.CreateLeavePayload) (string, error)
	GetMyLeaveRequests(ctx context.Context, userID string) ([]*models.LeaveRequest, error)
	GetPendingLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error)
	GetAllLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error)
	ReviewLeaveRequest(ctx context.Context, leaveID string, reviewerID string, payload *models.ReviewLeavePayload) error
}

type postgresLeaveRepository struct {
	db *pgxpool.Pool
}

func NewLeaveRepository(db *pgxpool.Pool) LeaveRepository {
	return &postgresLeaveRepository{db: db}
}

func (r *postgresLeaveRepository) CreateLeaveRequest(ctx context.Context, userID string, payload *models.CreateLeavePayload) (string, error) {
	query := `
			INSERT INTO leave_requests (user_id, type, start_date, end_date, reason)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
			`
	var newID string

	err := r.db.QueryRow(ctx, query, userID, payload.Type, payload.StartDate, payload.EndDate, payload.Reason).Scan(&newID)
	if err != nil {
		return "", err
	}

	return newID, nil
}

func (r *postgresLeaveRepository) GetMyLeaveRequests(ctx context.Context, userID string) ([]*models.LeaveRequest, error) {
	query := `
			SELECT id, user_id, type, start_date, end_date, reason, status, reviewer_id, reviewer_comment, created_at FROM leave_requests
			WHERE user_id = $1
			ORDER BY created_at DESC
			`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	LeaveRequests := make([]*models.LeaveRequest, 0)

	for rows.Next() {
		var leaveReq models.LeaveRequest

		err := rows.Scan(&leaveReq.ID, &leaveReq.UserID, &leaveReq.Type, &leaveReq.StartDate, &leaveReq.EndDate, &leaveReq.Reason, &leaveReq.Status, &leaveReq.ReviewerID, &leaveReq.ReviewerComment, &leaveReq.CreatedAt)
		if err != nil {
			return nil, err
		}

		LeaveRequests = append(LeaveRequests, &leaveReq)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return LeaveRequests, nil
}

func (r *postgresLeaveRepository) GetPendingLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error) {
	query := `
			SELECT l.id, l.user_id, l.type, l.start_date, l.end_date, l.reason, l.status, l.created_at, u.name, u.avatar_url
			FROM leave_requests l
			JOIN users u ON l.user_id = u.id
			WHERE l.status = 'pending'
			ORDER BY l.start_date ASC
			`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lr := make([]*models.LeaveRequestWithUser, 0)

	for rows.Next() {
		var l models.LeaveRequestWithUser

		err := rows.Scan(&l.ID, &l.UserID, &l.Type, &l.StartDate, &l.EndDate, &l.Reason, &l.Status, &l.CreatedAt, &l.UserName, &l.AvatarURL)
		if err != nil {
			return nil, err
		}

		lr = append(lr, &l)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return lr, nil
}

func (r *postgresLeaveRepository) GetAllLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error) {
	query := `
			SELECT l.id, l.user_id, l.type, l.start_date, l.end_date, l.reason, l.status, l.created_at, u.name, u.avatar_url
			FROM leave_requests l
			JOIN users u ON l.user_id = u.id
			ORDER BY l.created_at DESC 
			`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lr := make([]*models.LeaveRequestWithUser, 0)

	for rows.Next() {
		var l models.LeaveRequestWithUser

		err := rows.Scan(&l.ID, &l.UserID, &l.Type, &l.StartDate, &l.EndDate, &l.Reason, &l.Status, &l.CreatedAt, &l.UserName, &l.AvatarURL)
		if err != nil {
			return nil, err
		}

		lr = append(lr, &l)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return lr, nil
}

func (r *postgresLeaveRepository) ReviewLeaveRequest(ctx context.Context, leaveID string, reviewerID string, payload *models.ReviewLeavePayload) error {
	query := `
			UPDATE leave_requests
			SET status = $1, reviewer_id = $2, reviewer_comment = $3
			WHERE id = $4
			`
	result, err := r.db.Exec(ctx, query, payload.Status, reviewerID, payload.ReviewerComment, leaveID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return models.ErrLeaveRequestNotFound
	}

	return nil
}
