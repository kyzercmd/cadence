package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kyzercmd/cadence/internal/models"
)

type ProjectRepository interface {
	CreateProject(ctx context.Context, payload *models.CreateProjectPayload) (string, error)
	GetAllProjects(ctx context.Context) ([]*models.GetProjectResponse, error)
	GetProjectByUserID(ctx context.Context, userID string) ([]*models.GetProjectResponse, error)
	GetProjectByID(ctx context.Context, projectID string) (*models.GetProjectResponse, error)
	UpdateProject(ctx context.Context, projectID string, payload *models.UpdateProjectPayload) error
	SearchProjects(ctx context.Context, query string, userID string, role models.Role) ([]*models.Project, error)
}

type postgresProjectRepository struct {
	db *pgxpool.Pool
}

func NewProjectRepository(db *pgxpool.Pool) ProjectRepository {
	return &postgresProjectRepository{db: db}
}

func (r *postgresProjectRepository) CreateProject(ctx context.Context, payload *models.CreateProjectPayload) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", nil
	}
	defer tx.Rollback(ctx)

	var ProjectID string

	query := `
			INSERT INTO projects (code, name, description, status, priority, start_date, deadline, image_url)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id
			`
	err = tx.QueryRow(ctx, query, payload.Code, payload.Name, payload.Description, models.ProjectStatusActive, payload.Priority, payload.StartDate, payload.Deadline, payload.ImageURL).Scan(&ProjectID)

	if err != nil {
		if err == pgx.ErrNoRows {
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
			_, err := tx.Exec(ctx, memberQuery, ProjectID, memberID)
			if err != nil {
				return "", err
			}
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return "", err
	}

	return ProjectID, nil
}

func (r *postgresProjectRepository) UpdateProject(ctx context.Context, projectID string, payload *models.UpdateProjectPayload) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
			UPDATE projects SET name = $1, description = $2, status = $3, priority = $4, deadline = $5, image_url = $6 WHERE id = $7
			`
	row, err := tx.Exec(ctx, query, payload.Name, payload.Description, payload.Status, payload.Priority, payload.Deadline, payload.ImageURL, projectID)
	if err != nil {
		return err
	}

	if rowsAffected := row.RowsAffected(); rowsAffected == 0 {
		return models.ErrProjectNotFound
	}

	_, err = tx.Exec(ctx, `DELETE FROM project_members WHERE project_id = $1`, projectID)
	if err != nil {
		return err
	}

	if len(payload.MemberIDs) > 0 {
		memberQuery := `
						INSERT INTO project_members (project_id, user_id)
						VALUES ($1, $2)
						`
		for _, memberID := range payload.MemberIDs {
			_, err := tx.Exec(ctx, memberQuery, projectID, memberID)
			if err != nil {
				return err
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}

func (r *postgresProjectRepository) GetAllProjects(ctx context.Context) ([]*models.GetProjectResponse, error) {
	query := `
			SELECT p.id, p.code, p.name, p.description, p.status, p.priority, p.created_at, p.start_date, p.deadline, p.image_url, COALESCE(json_agg(pm.user_id) FILTER (WHERE pm.user_id IS NOT NULL), '[]') AS member_ids
			FROM projects p
			LEFT JOIN project_members pm ON p.id = pm.project_id
			GROUP BY p.id
			`

	rows, err := r.db.Query(ctx, query)
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

func (r *postgresProjectRepository) GetProjectByUserID(ctx context.Context, userID string) ([]*models.GetProjectResponse, error) {
	query := `
			SELECT p.id, p.code, p.name, p.description, p.status, p.priority, p.created_at, p.start_date, p.deadline, p.image_url,
			COALESCE(json_agg(pm_all.user_id) FILTER (WHERE pm_all.user_id IS NOT NULL), '[]')
			AS member_ids
			FROM projects p
			INNER JOIN project_members pm_filter ON p.id = pm_filter.project_id AND pm_filter.user_id = $1
			LEFT JOIN project_members pm_all ON p.id = pm_all.project_id
			GROUP BY p.id 
			`

	rows, err := r.db.Query(ctx, query, userID)
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

func (r *postgresProjectRepository) GetProjectByID(ctx context.Context, projectID string) (*models.GetProjectResponse, error) {
	query := `
		SELECT p.id, p.code, p.name, p.description, p.status, p.priority, p.created_at, p.start_date, p.deadline, p.image_url,
		COALESCE(json_agg(pm_all.user_id) FILTER (WHERE pm_all.user_id IS NOT NULL), '[]') AS member_ids
		FROM projects p
		LEFT JOIN project_members pm_all ON p.id = pm_all.project_id
		WHERE p.id = $1
		GROUP BY p.id 
	`
	var p models.GetProjectResponse
	var memberIDs []byte

	err := r.db.QueryRow(ctx, query, projectID).Scan(
		&p.ID, &p.Code, &p.Name, &p.Description, &p.Status, &p.Priority,
		&p.CreatedAt, &p.StartDate, &p.Deadline, &p.ImageURL, &memberIDs,
	)
	if err != nil {
		if errors.Is(err, models.ErrProjectNotFound) {
			return nil, models.ErrProjectNotFound
		}
		return nil, err
	}

	if err = json.Unmarshal(memberIDs, &p.MemberIDs); err != nil {
		return nil, err
	}

	return &p, nil
}

func (r *postgresProjectRepository) SearchProjects(ctx context.Context, query string, userID string, role models.Role) ([]*models.Project, error) {
	var stmt string
	var args []any

	if role == models.RoleAdmin || role == models.RoleHR {
		stmt = `
				SELECT id, name, status
				FROM projects
				WHERE name ILIKE '%' || $1 || '%'
				LIMIT 5
				`
		args = []any{query}
	} else {
		stmt = `
			   	SELECT p.id, p.name, p.status
				FROM projects p
				JOIN project_members pm ON p.id = pm.project_id
				WHERE p.name ILIKE '%' || $1 || '%' AND pm.user_id = $2
				LIMIT 5
				`
		args = []any{query, userID}
	}

	rows, err := r.db.Query(ctx, stmt, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []*models.Project
	for rows.Next() {
		var p models.Project

		if err := rows.Scan(&p.ID, &p.Name, &p.Status); err != nil {
			return nil, err
		}
		projects = append(projects, &p)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return projects, nil
}
