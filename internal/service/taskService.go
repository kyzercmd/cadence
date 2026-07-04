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
	GetTaskByID(ctx context.Context, taskID string) (*models.TaskDetailResponse, error)
	LogTime(ctx context.Context, taskID string, userID string, payload *models.LogTimePayload) error
}

type taskService struct {
	repo  repository.TaskRepository
	notif NotificationService
}

func NewTaskService(repo repository.TaskRepository, notif NotificationService) TaskService {
	return &taskService{repo: repo, notif: notif}
}

func (s *taskService) GetMyTasks(ctx context.Context, userID string) ([]*models.MyTaskResponse, error) {
	tasks, err := s.repo.GetTaskByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return tasks, nil
}

func (s *taskService) CreateTask(ctx context.Context, projectID string, payload *models.CreateTaskPayload) (string, error) {
	if payload.Attachments == nil {
		payload.Attachments = []string{}
	}
	if payload.Links == nil {
		payload.Links = []string{}
	}

	taskID, err := s.repo.CreateTaskWithAssignees(ctx, projectID, payload)
	if err != nil {
		return "", err
	}

	for _, assigneeID := range payload.AssigneeIDs {
		s.notif.CreateNotification(ctx, &models.CreateNotificationPayload{
			UserID: assigneeID,
			Title:  "New Task Assigned",
			Body:   "You have been assigned to a new task: " + payload.Name + " with " + string(payload.Priority) + " Priority",
		})
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

func (s *taskService) GetTaskByID(ctx context.Context, taskID string) (*models.TaskDetailResponse, error) {
	return s.repo.GetTaskByID(ctx, taskID)
}

func (s *taskService) LogTime(ctx context.Context, taskID string, userID string, payload *models.LogTimePayload) error {
	if payload.Hours <= 0 {
		return models.ErrHoursLessThanZero
	}
	err := s.repo.LogTime(ctx, taskID, userID, payload)
	if err != nil {
		return err
	}
	return nil
}
