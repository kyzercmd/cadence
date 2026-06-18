package service

import (
	"context"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	CreateEmployee(ctx context.Context, user *models.User) (*models.User, error)
	UpdateSelfProfile(ctx context.Context, userID string, payload *models.UserUpdatePayload) (*models.User, error)
	HRUpdateEmployee(ctx context.Context, targetUserID string, payload *models.UserUpdatePayload) (*models.User, error)
	AdminUpdateEmployee(ctx context.Context, targetUserID string, payload *models.UserUpdatePayload) (*models.User, error)
}

type userService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) CreateEmployee(ctx context.Context, user *models.User) (*models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user.Password = string(hashedPassword)
	user.Active = true

	err = s.repo.CreateUser(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userService) UpdateSelfProfile(ctx context.Context, userID string, payload *models.UserUpdatePayload) (*models.User, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if payload.AvatarURL != nil {
		user.AvatarURL = *payload.AvatarURL
	}
	if payload.Mobile != nil {
		user.Mobile = *payload.Mobile
	}
	if payload.Location != nil {
		user.Location = *payload.Location
	}
	if payload.Skype != nil {
		user.Skype = *payload.Skype
	}

	err = s.repo.UpdateUser(ctx, user)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *userService) HRUpdateEmployee(ctx context.Context, targetUserID string, payload *models.UserUpdatePayload) (*models.User, error) {
	user, err := s.repo.GetUserByID(ctx, targetUserID)
	if err != nil {
		return nil, err
	}

	if payload.Name != nil {
		user.Name = *payload.Name
	}
	if payload.AvatarURL != nil {
		user.AvatarURL = *payload.AvatarURL
	}
	if payload.Level != nil {
		user.Level = *payload.Level
	}
	if payload.Gender != nil {
		user.Gender = *payload.Gender
	}
	if payload.Birthday != nil {
		user.Birthday = *payload.Birthday
	}
	if payload.Company != nil {
		user.Company = *payload.Company
	}
	if payload.Location != nil {
		user.Location = *payload.Location
	}
	if payload.Mobile != nil {
		user.Mobile = *payload.Mobile
	}
	if payload.Skype != nil {
		user.Skype = *payload.Skype
	}
	if payload.Active != nil {
		user.Active = *payload.Active
	}

	err = s.repo.UpdateUser(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userService) AdminUpdateEmployee(ctx context.Context, targetUserID string, payload *models.UserUpdatePayload) (*models.User, error) {
	user, err := s.repo.GetUserByID(ctx, targetUserID)
	if err != nil {
		return nil, err
	}

	if payload.Name != nil {
		user.Name = *payload.Name
	}
	if payload.AvatarURL != nil {
		user.AvatarURL = *payload.AvatarURL
	}
	if payload.Level != nil {
		user.Level = *payload.Level
	}
	if payload.Gender != nil {
		user.Gender = *payload.Gender
	}
	if payload.Birthday != nil {
		user.Birthday = *payload.Birthday
	}
	if payload.Company != nil {
		user.Company = *payload.Company
	}
	if payload.Location != nil {
		user.Location = *payload.Location
	}
	if payload.Mobile != nil {
		user.Mobile = *payload.Mobile
	}
	if payload.Skype != nil {
		user.Skype = *payload.Skype
	}
	if payload.Active != nil {
		user.Active = *payload.Active
	}

	if payload.Position != nil {
		user.Position = *payload.Position
	}
	if payload.Role != nil {
		user.Role = *payload.Role
	}
	if payload.Email != nil {
		user.Email = *payload.Email
	}
	if payload.Password != nil {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*payload.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.Password = string(hashedPassword)
	}

	err = s.repo.UpdateUser(ctx, user)
	if err != nil {
		return nil, err
	}
	return user, nil
}
