package repository

import (
	"context"
	"database/sql"

	"github.com/kyzercmd/cadence/internal/models"
)

type TaskRepository interface {
	GetTaskByUserID(ctx context.Context, userID string) ([]*models.MyTaskResponse, error)
}

type postgresTaskRepositoy struct {
	db *sql.DB
}

func newTaskRepository(db *sql.DB) TaskRepository {
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
