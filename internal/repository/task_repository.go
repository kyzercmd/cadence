package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/kyzercmd/cadence/internal/models"
)

type TaskRepository interface {
	GetTaskByUserID(ctx context.Context, userID string) ([]*models.MyTaskResponse, error)
	CreateTaskWithAssignees(ctx context.Context, projectID string, payload *models.CreateTaskPayload) (string, error)
	UpdateTaskStatus(ctx context.Context, status models.TaskStatus, taskID string) error
	UpdateTask(ctx context.Context, taskID string, payload *models.UpdateTaskPayload) error
	GetTasksByProjectID(ctx context.Context, projectID string) ([]*models.BoardTaskResponse, error)
	GetTaskByID(ctx context.Context, taskID string) (*models.TaskDetailResponse, error)
	LogTime(ctx context.Context, taskID string, userID string, payload *models.LogTimePayload) error
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

func (r *postgresTaskRepositoy) UpdateTaskStatus(ctx context.Context, status models.TaskStatus, taskID string) error {
	query := `
			UPDATE tasks SET status = $1 WHERE id = $2
			`

	result, err := r.db.ExecContext(ctx, query, status, taskID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return models.ErrTaskNotFound
	}
	return nil
}

func (r *postgresTaskRepositoy) UpdateTask(ctx context.Context, taskID string, payload *models.UpdateTaskPayload) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
			UPDATE tasks SET name = $1, description = $2, status = $3, priority = $4, estimate_hour = $5, due_date = $6, attachments = $7, links = $8 WHERE id = $9
			`

	result, err := tx.ExecContext(ctx, query, payload.Name, payload.Description, payload.Status, payload.Priority, payload.EstimateHours, payload.DueDate, payload.Attachments, payload.Links, taskID)
	if err != nil {
		return err
	}
	if rowsAffected, _ := result.RowsAffected(); rowsAffected == 0 {
		return models.ErrTaskNotFound
	}

	deleteQuery := `
					DELETE FROM task_assignees WHERE task_id = $1
				`
	_, err = tx.ExecContext(ctx, deleteQuery, taskID)
	if err != nil {
		return err
	}

	if len(payload.AssigneeIDs) > 0 {
		insertQuery := `
					INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)
					`
		for _, userID := range payload.AssigneeIDs {
			_, err := tx.ExecContext(ctx, insertQuery, taskID, userID)
			if err != nil {
				return err
			}
		}
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (r *postgresTaskRepositoy) GetTasksByProjectID(ctx context.Context, projectID string) ([]*models.BoardTaskResponse, error) {
	query := `
			SELECT t.id, t.name, t.status, t.priority, t.estimate_hours, t.due_date, COALESCE(SUM(ta.spent_hours), 0) AS total_spent_hours,
			COALESCE(json_agg(json_build_object('id', u.id, 'name', u.name))
			FILTER (WHERE u.id IS NOT NULL), '[]') AS assignees
			FROM tasks t
			LEFT JOIN task_assignees ta ON t.id = ta.task_id
			LEFT JOIN users u ON ta.user_id = u.id
			WHERE t.project_id = $1
			GROUP BY t.id
			`
	rows, err := r.db.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]*models.BoardTaskResponse, 0)

	for rows.Next() {
		task := &models.BoardTaskResponse{}
		var assigneesJSON []byte

		err := rows.Scan(&task.ID, &task.Name, &task.Status, &task.Priority, &task.EstimateHours, &task.DueDate, &task.TotalSpentHours, &assigneesJSON)
		if err != nil {
			return nil, err
		}

		if err := json.Unmarshal(assigneesJSON, &task.Assignee); err != nil {
			return nil, err
		}

		tasks = append(tasks, task)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return tasks, err
}

func (r *postgresTaskRepositoy) GetTaskByID(ctx context.Context, taskID string) (*models.TaskDetailResponse, error) {
	query := `
			SELECT t.id, t.project_id, t.name, t.description, t.status, t.priority, t.estimate_hours, t.due_date, t.attachments, t.links, COALESCE(SUM(ta.spent_hours), 0) AS total_spent_hours,
			COALESCE(json_agg(json_build_object('id', u.id, 'name', u.name)) FILTER (WHERE u.id IS NOT NULL), '[]') AS  assignees
			FROM tasks t
			LEFT JOIN task_assignees ta ON t.id = ta.task_id
			LEFT JOIN users u ON ta.user_id = u.id
			WHERE t.id = $1
			GROUP BY t.id
			`
	task := &models.TaskDetailResponse{}
	var assigneesJSON []byte

	err := r.db.QueryRowContext(ctx, query, taskID).Scan(&task.ID, &task.ProjectID, &task.Name, &task.Description, &task.Status, &task.Priority, &task.EstimateHours, &task.DueDate, &task.Attachments, &task.Links, &task.TotalSpentHours, &assigneesJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, models.ErrTaskNotFound
		}
		return nil, err
	}

	if err := json.Unmarshal(assigneesJSON, &task.Assignees); err != nil {
		return nil, err
	}

	return task, nil
}

func (r *postgresTaskRepositoy) LogTime(ctx context.Context, taskID string, userID string, payload *models.LogTimePayload) error {
	query := `
			UPDATE task_assignees SET spent_hours = spent_hours + $1 
			WHERE task_id = $2 AND user_id = $3
			`
	result, err := r.db.ExecContext(ctx, query, payload.Hours, taskID, userID)
	if err != nil {
		return err
	}
	if rowsAffected, _ := result.RowsAffected(); rowsAffected == 0 {
		return models.ErrUserNotAssigned
	}

	return nil
}
