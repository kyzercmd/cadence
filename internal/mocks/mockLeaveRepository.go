package mocks

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
)

type MockLeaveRepository struct {
	ReturnID  string
	ReturnErr error
	CallCount int
}

func (m *MockLeaveRepository) CreateLeaveRequest(ctx context.Context, userID string, payload *models.CreateLeavePayload) (string, error) {
	m.CallCount++
	return m.ReturnID, m.ReturnErr
}
func (m *MockLeaveRepository) GetMyLeaveRequests(ctx context.Context, userID string) ([]*models.LeaveRequest, error) {
	return nil, nil
}
func (m *MockLeaveRepository) GetPendingLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error) {
	return nil, nil
}
func (m *MockLeaveRepository) GetAllLeaveRequests(ctx context.Context) ([]*models.LeaveRequestWithUser, error) {
	return nil, nil
}
func (m *MockLeaveRepository) ReviewLeaveRequest(ctx context.Context, leaveID string, reviewerID string, payload *models.ReviewLeavePayload) (string, error) {
	m.CallCount++
	return m.ReturnID, m.ReturnErr
}
