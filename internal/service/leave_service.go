package service

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
)

type LeaveService interface {
	CreateLeaveRequest(ctx context.Context, userID string, payload *models.CreateLeavePayload) (string, error)
	GetMyLeaveRequests(ctx context.Context, userID string) ([]*models.LeaveRequest, error)
	GetPendingLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error)
	GetAllLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error)
	ReviewLeaveRequest(ctx context.Context, leaveID string, reviewerID string, payload *models.ReviewLeavePayload) error
}

type leaveService struct {
	repo repository.LeaveRepository
}

func NewLeaveService(r repository.LeaveRepository) LeaveService {
	return &leaveService{repo: r}
}

func (s *leaveService) CreateLeaveRequest(ctx context.Context, userID string, payload *models.CreateLeavePayload) (string, error) {
	if payload.EndDate.Before(payload.StartDate) {
		return "", models.ErrInvalidLeaveDates
	}

	if payload.Type != models.LeaveTypeSick && payload.Type != models.LeaveTypeVacation && payload.Type != models.LeaveTypeRemote {
		return "", models.ErrInvalidLeaveType
	}

	return s.repo.CreateLeaveRequest(ctx, userID, payload)
}

func (s *leaveService) GetMyLeaveRequests(ctx context.Context, userID string) ([]*models.LeaveRequest, error) {
	return s.repo.GetMyLeaveRequests(ctx, userID)
}

func (s *leaveService) GetPendingLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error) {
	return s.repo.GetPendingLeaveRequests(ctx)
}

func (s *leaveService) GetAllLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error) {
	return s.repo.GetAllLeaveRequests(ctx)
}

func (s *leaveService) ReviewLeaveRequest(ctx context.Context, leaveID string, reviewerID string, payload *models.ReviewLeavePayload) error {
	if payload.Status != models.LeaveStatusApproved && payload.Status != models.LeaveStatusRejected {
		return models.ErrInvalidLeaveStatus
	}

	return s.repo.ReviewLeaveRequest(ctx, leaveID, reviewerID, payload)
}
