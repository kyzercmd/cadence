package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/kyzercmd/cadence/internal/mocks"
	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/service"
)

func Test_leaveService_CreateLeaveRequest(t *testing.T) {
	tests := []struct {
		name string // description of this test case
		// Named input parameters for target function.
		userID        string
		payload       *models.CreateLeavePayload
		want          string
		wantErr       bool
		mockReturnErr error
	}{{
		name:   "Successful Leave Creation",
		userID: "1",
		payload: &models.CreateLeavePayload{
			Type:      models.LeaveTypeRemote,
			Reason:    "valid reason",
			StartDate: time.Now(),
			EndDate:   time.Now().Add(48 * time.Hour),
		},
		want:          "1",
		wantErr:       false,
		mockReturnErr: nil,
	}, {
		name:   "Start greater than End",
		userID: "1",
		payload: &models.CreateLeavePayload{
			Type:      models.LeaveTypeRemote,
			Reason:    "valid reason",
			StartDate: time.Now().Add(24 * time.Hour),
			EndDate:   time.Now(),
		},
		want:          "",
		wantErr:       true,
		mockReturnErr: models.ErrInvalidLeaveDates,
	},
		{
			name:   "Invalid leave type",
			userID: "1",
			payload: &models.CreateLeavePayload{
				Type:      "random",
				Reason:    "valid reason",
				StartDate: time.Now(),
				EndDate:   time.Now().Add(24 * time.Hour),
			},
			want:          "",
			wantErr:       true,
			mockReturnErr: models.ErrInvalidLeaveType,
		}}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &mocks.MockLeaveRepository{
				ReturnID:  tt.want,
				ReturnErr: tt.mockReturnErr,
			}
			u := &mocks.MockUserRepository{
				ReturnErr: nil,
			}
			n := &mocks.MockNotificationRepository{
				MockReturnErr: nil,
			}
			notificationService := service.NewNotificationService(n)
			s := service.NewLeaveService(r, notificationService, u)

			got, gotErr := s.CreateLeaveRequest(context.Background(), tt.userID, tt.payload)
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("CreateLeaveRequest() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("CreateLeaveRequest() succeeded unexpectedly")
			}
			if got != tt.want {
				t.Errorf("CreateLeaveRequest() = %v, want %v", got, tt.want)
			}
		})
	}
}
