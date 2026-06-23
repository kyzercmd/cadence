package service

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
)

type AttendanceService interface {
	ClockIn(ctx context.Context, userID string) (*models.AttendanceEntry, error)
	ClockOut(ctx context.Context, userID string) (*models.AttendanceEntry, error)
	GetTodayAttendance(ctx context.Context, userID string) (*models.AttendanceEntry, error)
	GetAttendanceHistory(ctx context.Context, userID string, limit int) ([]*models.AttendanceEntry, error)
	GetAllEmployeesAttendance(ctx context.Context) ([]*models.EmployeeLatestAttendance, error)
}

type attendanceService struct {
	repo repository.AttendanceRepository
}

func NewAttendanceService(r repository.AttendanceRepository) AttendanceService {
	return &attendanceService{repo: r}
}

func (s *attendanceService) ClockIn(ctx context.Context, userID string) (*models.AttendanceEntry, error) {
	return s.repo.ClockIn(ctx, userID)
}

func (s *attendanceService) ClockOut(ctx context.Context, userID string) (*models.AttendanceEntry, error) {
	return s.repo.ClockOut(ctx, userID)
}

func (s *attendanceService) GetTodayAttendance(ctx context.Context, userID string) (*models.AttendanceEntry, error) {
	return s.repo.GetTodayAttendance(ctx, userID)
}

func (s *attendanceService) GetAttendanceHistory(ctx context.Context, userID string, limit int) ([]*models.AttendanceEntry, error) {
	return s.repo.GetAttendanceHistory(ctx, userID, limit)
}

func (s *attendanceService) GetAllEmployeesAttendance(ctx context.Context) ([]*models.EmployeeLatestAttendance, error) {
	return s.repo.GetAllEmployeesAttendance(ctx)
}
