package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/kyzercmd/cadence/internal/models"
)

type ProjectRepository interface {
	CreateProject(ctx context.Context, payload *models.CreateProjectPayload) (string, error)
	GetAllProjects(ctx context.Context) ([]*models.GetProjectResponse, error)
	GetProjectByID(ctx context.Context, userID string) ([]*models.GetProjectResponse, error)
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

func (r *postgresProjectRepository) GetAllProjects(ctx context.Context) ([]*models.GetProjectResponse, error) {
	query := `
			SELECT p.id, p.code, p.name, p.description, p.status, p.priority, p.created_at, p.start_date, p.start_date, p.deadline, p.image_url, COALESCE(json_agg(pm.user_id) FILTER (WHERE pm.user_id IS NOT NULL), '[]') AS member_ids
			FROM projects p
			LEFT JOIN project_members pm ON p.id = pm.project_id
			GROUP BY p.id
			`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := make([]*models.GetProjectResponse, 0)

	for rows.Next() {
		var p models.GetProjectResponse
		var memberIDs []byte

		err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Status, &p.Priority, &p.CreatedAt, &p.StartDate, &p.Deadline, &p.ImageURL, &memberIDs)
		if err != nil {
			return nil, err
		}

		if err = json.Unmarshal(memberIDs, &p.MemberIDs); err != nil {
			return nil, err
		}

		projects = append(projects, &p)

	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return projects, nil
}

func (r *postgresProjectRepository) GetProjectByID(ctx context.Context, userID string) ([]*models.GetProjectResponse, error) {
	query := `
			SELECT p.id, p.code, p.name, p.description, p.status, p.priority, p.created_at, p.start_date, p.deadline, p.image_url,
			COALESCE(json_agg(pm_all.user_id) FILTER (WHERE pm_all.user_id IS NOT NULL), '[]')
			AS member_ids
			FROM projects p
			INNER JOIN project_members pm_filter ON p.id = pm_filter.project_id AND pm_filter.user_id = $1
			LEFT JOIN project_members pm_all ON p.id = pm_all.project_id
			GROUP BY p.id 
			`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := make([]*models.GetProjectResponse, 0)

	for rows.Next() {
		var p models.GetProjectResponse
		var memberIDs []byte

		err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Status, &p.Priority, &p.CreatedAt, &p.StartDate, &p.Deadline, &p.ImageURL, &memberIDs)
		if err != nil {
			return nil, err
		}

		if err = json.Unmarshal(memberIDs, &p.MemberIDs); err != nil {
			return nil, err
		}

		if err = rows.Err(); err != nil {
			return nil, err
		}

		projects = append(projects, &p)
	}

	return projects, nil
}
