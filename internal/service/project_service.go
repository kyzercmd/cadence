package service

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
)

type ProjectService interface {
	CreateProject(ctx context.Context, payload *models.CreateProjectPayload) (string, error)
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
