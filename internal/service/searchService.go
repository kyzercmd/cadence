package service

import (
	"context"
	"sync"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
)

type SearchService interface {
	GlobalSearch(ctx context.Context, query string, userID string, role models.Role) ([]models.SearchResult, error)
}

type searchService struct {
	projectRepo repository.ProjectRepository
	taskRepo    repository.TaskRepository
	userRepo    repository.UserRepository
}

func NewSearchService(p repository.ProjectRepository, t repository.TaskRepository, u repository.UserRepository) SearchService {
	return &searchService{projectRepo: p, taskRepo: t, userRepo: u}
}

func (s *searchService) GlobalSearch(ctx context.Context, query string, userID string, role models.Role) ([]models.SearchResult, error) {
	var results []models.SearchResult

	var wg sync.WaitGroup
	var mu sync.Mutex

	if role == models.RoleAdmin || role == models.RoleHR {
		wg.Go(func() {
			users, err := s.userRepo.SearchUserByNameOrEmail(ctx, query)
			if err != nil {
				return
			}

			var tempResults []models.SearchResult
			for _, u := range users {
				tempResults = append(tempResults, models.SearchResult{
					Type:     "user",
					ID:       u.ID,
					Title:    u.Name,
					Subtitle: u.Email,
					URL:      "/employees/" + u.ID,
				})
			}
			mu.Lock()
			results = append(results, tempResults...)
			mu.Unlock()
		})
	}
	wg.Go(func() {
		projects, err := s.projectRepo.SearchProjects(ctx, query, userID, role)
		if err != nil {
			return
		}

		var tempResults []models.SearchResult
		for _, p := range projects {
			tempResults = append(tempResults, models.SearchResult{
				Type:     "project",
				ID:       p.ID,
				Title:    p.Name,
				Subtitle: p.Status,
				URL:      "/projects/" + p.ID,
			})
		}
		mu.Lock()
		results = append(results, tempResults...)
		mu.Unlock()
	})
	wg.Go(func() {
		tasks, err := s.taskRepo.SearchTasks(ctx, query, userID)
		if err != nil {
			return
		}

		var tempResults []models.SearchResult
		for _, t := range tasks {
			tempResults = append(tempResults, models.SearchResult{
				Type:     "task",
				ID:       t.ID,
				Title:    t.Name,
				Subtitle: string(t.Status),
			})
		}
		mu.Lock()
		results = append(results, tempResults...)
		mu.Unlock()
	})

	wg.Wait()
	return results, nil
}
