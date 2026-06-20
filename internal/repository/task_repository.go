package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/kyzercmd/cadence/internal/models"
)

var ErrProjectNotFound = errors.New("Project not found")

type TaskRepository interface {
	GetTaskByUserID(ctx context.Context, userID string) ([]*models.MyTaskResponse, error)
	CreateTaskWithAssignees(ctx context.Context, projectID string, payload *models.CreateTaskPayload) (string, error)
}

type postgresTaskRepositoy struct {
	db *sql.DB
}

func NewTaskRepository(db *sql.DB) TaskRepository {
	return &postgresTaskRepositoy{db: db}
}

func (r *postgresTaskRepositoy) GetTaskByUserID(ctx context.Context, userID string) ([]*models.MyTaskResponse, error) {
	query := `
			SELECT t.id, t.name, t.status, t.priority, t.due_date, p.name
			FROM tasks t
			JOIN task_assignees ta ON t.id = ta.task_id
			JOIN projects p ON t.project_id = p.id
			WHERE ta.user_id = $1
			`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks = make([]*models.MyTaskResponse, 0)

	for rows.Next() {
		var task models.MyTaskResponse

		var nullDueDate sql.NullString

		err := rows.Scan(&task.ID, task.TaskName, task.Status, task.Priority, &nullDueDate, &task.ProjectName)
		if err != nil {
			return nil, err
		}

		if nullDueDate.Valid {
			task.DueDate = &nullDueDate.String
		}

		tasks = append(tasks, &task)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return tasks, nil
}

func (r *postgresTaskRepositoy) CreateTaskWithAssignees(ctx context.Context, projectID string, payload *models.CreateTaskPayload) (string, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	var newTaskID string

	query := `
			INSERT INTO tasks (project_id, name, description, priority, estimate_hours, due_date, attachments, links)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id
			`
	err = tx.QueryRowContext(ctx, query, projectID, payload.Name, payload.Description, payload.Priority, payload.EstimateHours, payload.DueDate, payload.Attachments, payload.Links).Scan(&newTaskID)
	if err != nil {
		return "", err
	}

	if len(payload.AssigneeIDs) > 0 {
		query := `
				INSERT INTO task_assignees (task_id, user_id)
				VALUES ($1, $2)
				`
		for _, userID := range payload.AssigneeIDs {
			result, err := tx.ExecContext(ctx, query, newTaskID, userID)
			if err != nil {
				return "", err
			}
			if rowsAffected, _ := result.RowsAffected(); rowsAffected == 0 {
				return "", errors.New("No rows affected")
			}
		}
	}

	err = tx.Commit()
	if err != nil {
		return "", err
	}
	return newTaskID, nil
}
