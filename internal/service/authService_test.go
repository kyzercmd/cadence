package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kyzercmd/cadence/internal/mocks"
	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/service"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthServiceLogin(t *testing.T) {
	validPassword := "correct_password"
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(validPassword), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("Failed to generate hash: %v", err)
	}
	validHash := string(hashedBytes)

	tests := []struct {
		name           string
		email          string
		password       string
		mockReturnUser *models.User
		mockReturnErr  error
		expectError    bool
	}{
		{
			name:     "Valid Login",
			email:    "admin@hrm.com",
			password: "correct_password",
			mockReturnUser: &models.User{
				ID:       "1",
				Email:    "admin@hrm.com",
				Password: validHash,
				Active:   true,
			},
			mockReturnErr: nil,
			expectError:   false,
		},
		{
			name:           "User_not_found",
			email:          "unknown@hrm.com",
			password:       "any_password",
			mockReturnUser: nil,
			mockReturnErr:  models.ErrUserNotFound,
			expectError:    true,
		},
		{
			name:     "Invalid Password",
			email:    "admin@hrm.com",
			password: "wrong_password",
			mockReturnUser: &models.User{
				ID:       "1",
				Email:    "admin@hrm.com",
				Password: validHash,
				Active:   true,
			},
			mockReturnErr: nil,
			expectError:   true,
		},
		{
			name:     "Deactivated User Account",
			email:    "fired_employee@hrm.com",
			password: "correct_password",
			mockReturnUser: &models.User{
				ID:       "2",
				Email:    "fired_employee@hrm.com",
				Password: validHash,
				Active:   false,
			},
			mockReturnErr: nil,
			expectError:   true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mockRepo := &mocks.MockUserRepository{
				ReturnUser: tc.mockReturnUser,
				ReturnErr:  tc.mockReturnErr,
				CallCount:  0,
			}

			authService := service.NewAuthService(mockRepo, "super_secret_test_secret")

			session, err := authService.Login(context.Background(), tc.email, tc.password)

			hasError := err != nil
			if hasError != tc.expectError {
				t.Errorf("Expected Error: %v, Got Error state: %v (err: %v)", tc.expectError, hasError, err)
			}

			if !tc.expectError && session == nil {
				t.Errorf("Expected a valid authSession, Got nil")
			}

			if tc.expectError && session != nil {
				t.Errorf("Expected nil authSession on failure, Got: %v", session)
			}

			if mockRepo.CallCount != 1 {
				t.Errorf("Expected repository to be called once, got %v", mockRepo.CallCount)
			}
		})

	}
}

func TestAuthServiceRefreshSession(t *testing.T) {
	testSecret := "very_secret_secret_token"
	testUserID := "1"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": testUserID,
		"exp": time.Now().Add(time.Hour * 24).Unix(),
	})
	validToken, err := token.SignedString([]byte(testSecret))
	if err != nil {
		t.Fatalf("Failed to generate test JWT: %v", err)
	}

	expiredTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "1",
		"exp": time.Now().Add(-time.Hour * 24).Unix(),
	})
	expiredToken, err := expiredTokenObj.SignedString([]byte(testSecret))
	if err != nil {
		t.Fatalf("Failed to generate test JWT: %v", err)
	}

	tests := []struct {
		name           string
		refreshToken   string
		mockReturnUser *models.User
		mockReturnErr  error
		want           *models.AuthSession
		wantErr        bool
	}{
		{
			name:           "Empty Token",
			refreshToken:   "",
			mockReturnUser: nil,
			mockReturnErr:  nil,
			want:           nil,
			wantErr:        true,
		},
		{
			name:           "Invalid token signature",
			refreshToken:   "fake.jwt.token",
			mockReturnUser: nil,
			mockReturnErr:  nil,
			want:           nil,
			wantErr:        true,
		},
		{
			name:           "Expired Token",
			refreshToken:   expiredToken,
			mockReturnUser: nil,
			mockReturnErr:  nil,
			want:           nil,
			wantErr:        true,
		},
		{
			name:         "Valid Token Success",
			refreshToken: validToken,
			mockReturnUser: &models.User{
				ID:     "1",
				Email:  "admin@hrm.com",
				Active: true,
			},
			mockReturnErr: nil,
			want: &models.AuthSession{
				Token:        "new_token",
				RefreshToken: "new_refresh_token",
				User: models.User{
					ID:    "1",
					Email: "admin@hrm.com",
				},
			},
			wantErr: false,
		},
		{
			name:         "Deactivated User Account",
			refreshToken: validToken,
			mockReturnUser: &models.User{
				ID:     "1",
				Active: false,
			},
			want:    nil,
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mocks.MockUserRepository{
				ReturnUser: tt.mockReturnUser,
				ReturnErr:  tt.mockReturnErr,
			}

			s := service.NewAuthService(mockRepo, testSecret)

			got, gotErr := s.RefreshSession(context.Background(), tt.refreshToken)
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("RefreshSession() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("RefreshSession() succeeded unexpectedly")
			}
			if got.User.ID != tt.want.User.ID || got.User.Email != tt.want.User.Email {
				t.Errorf("RefreshSession() returned User = %v, want User = %v", got.User, tt.want.User)
			}

			if got.Token == "" || got.RefreshToken == "" {
				t.Errorf("RefreshSession() failed to generate new tokens, got: %v", got)
			}
		})
	}
}
