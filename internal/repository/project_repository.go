package repository

import (
	"context"
	"database/sql"

	"github.com/kyzercmd/cadence/internal/models"
)

type ProjectRepository interface {
	CreateProject(ctx context.Context, payload *models.CreateProjectPayload) (string, error)
}

type postgresProjectRepository struct {
	db *sql.DB
}

func NewProjectRepository(db *sql.DB) ProjectRepository {
	return &postgresProjectRepository{db: db}
}

func (r *postgresProjectRepository) CreateProject(ctx context.Context, payload *models.CreateProjectPayload) (string, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return "", nil
	}
	defer tx.Rollback()

	var ProjectID string

	query := `
			INSERT INTO projects (code, name, description, status, priority, start_date, deadline, image_url)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id
			`
	err = tx.QueryRowContext(ctx, query, payload.Code, payload.Name, payload.Description, models.ProjectStatusActive, payload.Priority, payload.StartDate, payload.Deadline, payload.ImageURL).Scan(&ProjectID)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", models.ErrProjectCodeExists
		}
		return "", err
	}

	if len(payload.MemberIDs) > 0 {
		memberQuery := `
						INSERT INTO project_members (project_id, user_id)
						VALUES ($1, $2)
						`
		for _, memberID := range payload.MemberIDs {
			_, err := tx.ExecContext(ctx, memberQuery, ProjectID, memberID)
			if err != nil {
				return "", err
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return "", err
	}

	return ProjectID, nil
}
