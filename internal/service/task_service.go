package service

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
)

type TaskService interface {
	GetMyTasks(ctx context.Context, userID string) ([]*models.MyTaskResponse, error)
	CreateTask(ctx context.Context, projectID string, payload *models.CreateTaskPayload) (string, error)
	UpdateTaskStatus(ctx context.Context, status models.TaskStatus, taskID string) error
	UpdateTask(ctx context.Context, taskID string, payload *models.UpdateTaskPayload) error
	GetTasksByProjectID(ctx context.Context, projectID string) ([]*models.BoardTaskResponse, error)
}

type taskService struct {
	repo repository.TaskRepository
}

func NewTaskService(repo repository.TaskRepository) TaskService {
	return &taskService{repo: repo}
}

func (s *taskService) GetMyTasks(ctx context.Context, userID string) ([]*models.MyTaskResponse, error) {
	tasks, err := s.repo.GetTaskByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return tasks, nil
}

func (s *taskService) CreateTask(ctx context.Context, projectID string, payload *models.CreateTaskPayload) (string, error) {
	taskID, err := s.repo.CreateTaskWithAssignees(ctx, projectID, payload)
	if err != nil {
		return "", err
	}

	return taskID, nil
}

func (s *taskService) UpdateTaskStatus(ctx context.Context, status models.TaskStatus, taskID string) error {
	return s.repo.UpdateTaskStatus(ctx, status, taskID)
}

func (s *taskService) UpdateTask(ctx context.Context, taskID string, payload *models.UpdateTaskPayload) error {
	return s.repo.UpdateTask(ctx, taskID, payload)
}

func (s *taskService) GetTasksByProjectID(ctx context.Context, projectID string) ([]*models.BoardTaskResponse, error) {
	return s.repo.GetTasksByProjectID(ctx, projectID)
}
