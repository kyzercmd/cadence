package service

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
)

type TaskService interface {
	GetMyTasks(ctx context.Context, userID string) ([]*models.MyTaskResponse, error)
}

type taskService struct {
	repo repository.TaskRepository
}

func newTaskService(repo repository.TaskRepository) TaskService {
	return &taskService{repo: repo}
}

func (s *taskService) GetMyTasks(ctx context.Context, userID string) ([]*models.MyTaskResponse, error) {
	tasks, err := s.repo.GetTaskByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return tasks, nil
}
