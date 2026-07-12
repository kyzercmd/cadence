package mocks

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
)

type MockUserRepository struct {
	ReturnUser *models.User
	ReturnErr  error
	CallCount  int
}

func (m *MockUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	m.CallCount++
	return m.ReturnUser, m.ReturnErr
}

func (m *MockUserRepository) GetUserByID(ctx context.Context, ID string) (*models.User, error) {
	m.CallCount++
	return m.ReturnUser, m.ReturnErr
}
func (m *MockUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	return nil
}
func (m *MockUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	return nil
}
func (m *MockUserRepository) GetAllUsers(ctx context.Context) ([]*models.UserListResponse, error) {
	return nil, nil
}
func (m *MockUserRepository) GetHRAndAdminIDs(ctx context.Context) ([]string, error) {
	return nil, nil
}
