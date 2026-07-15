package service

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
)

type ProjectService interface {
	CreateProject(ctx context.Context, payload *models.CreateProjectPayload) (string, error)
	GetProjects(ctx context.Context, userID string, userRole models.Role) ([]*models.GetProjectResponse, error)
	GetProjectByID(ctx context.Context, projectID string) (*models.GetProjectResponse, error)
	UpdateProjectByID(ctx context.Context, projectID string, payload *models.UpdateProjectPayload) error
}

type projectService struct {
	repo repository.ProjectRepository
}

func NewProjectService(repo repository.ProjectRepository) ProjectService {
	return &projectService{repo: repo}
}

func (s *projectService) CreateProject(ctx context.Context, payload *models.CreateProjectPayload) (string, error) {
	return s.repo.CreateProject(ctx, payload)
}

func (s *projectService) GetProjects(ctx context.Context, userID string, userRole models.Role) ([]*models.GetProjectResponse, error) {
	if userRole == models.RoleAdmin || userRole == models.RoleHR {
		projects, err := s.repo.GetAllProjects(ctx)
		if err != nil {
			return nil, err
		}
		return projects, err
	}

	return s.repo.GetProjectByUserID(ctx, userID)
}

func (s *projectService) GetProjectByID(ctx context.Context, projectID string) (*models.GetProjectResponse, error) {
	return s.repo.GetProjectByID(ctx, projectID)
}

func (s *projectService) UpdateProjectByID(ctx context.Context, projectID string, payload *models.UpdateProjectPayload) error {
	return s.repo.UpdateProject(ctx, projectID, payload)
}
