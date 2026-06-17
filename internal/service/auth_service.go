package service

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("Invalid Email or Password")

type AuthService interface {
	Login(ctx context.Context, email string, password string) (*models.AuthSession, error)
	RefreshSession(ctx context.Context, refreshToken string) (*models.AuthSession, error)
	SeedAdmin(ctx context.Context, email string, password string) error
}

type authService struct {
	repo      repository.UserRepository
	jwtSecret []byte
}

func NewAuthService(repo repository.UserRepository, secret string) AuthService {
	return &authService{
		repo:      repo,
		jwtSecret: []byte(secret),
	}
}

func (s *authService) Login(ctx context.Context, email string, password string) (*models.AuthSession, error) {
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if err == repository.ErrUserNotFound {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	accessToken, refreshToken, err := s.GenerateTokens(user.ID, string(user.Role))
	if err != nil {
		return nil, err
	}

	return &models.AuthSession{
		Token:        accessToken,
		RefreshToken: refreshToken,
		User:         *user,
	}, nil
}

func (s *authService) RefreshSession(ctx context.Context, refreshToken string) (*models.AuthSession, error) {
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (any, error) {
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid map claims")
	}

	userID := claims["sub"].(string)

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if err == repository.ErrUserNotFound {
			return nil, errors.New("User doesnt exist")
		}
		return nil, err
	}

	if !user.Active {
		return nil, errors.New("user account deactivated")
	}

	newSessionToken, newRefreshToken, err := s.GenerateTokens(userID, string(user.Role))
	if err != nil {
		return nil, err
	}

	return &models.AuthSession{
		Token:        newSessionToken,
		RefreshToken: newRefreshToken,
		User:         *user,
	}, nil
}

func (s *authService) SeedAdmin(ctx context.Context, email string, password string) error {
	_, err := s.repo.GetUserByEmail(ctx, email)
	if err == nil {
		return nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil
	}

	adminUser := &models.User{
		Name:      "Administrator",
		Email:     email,
		Password:  string(hashedPassword),
		AvatarURL: "",
		Role:      models.RoleAdmin,
		Position:  "System Owner",
		Level:     models.LevelSenior,
		Gender:    models.GenderMale,
		Birthday:  "1995-01-01",
		Company:   "My Company",
		Location:  "Office",
		Mobile:    "+8801700000000",
		Skype:     "",
		Active:    true,
	}

	err = s.repo.CreateUser(ctx, adminUser)
	return err
}

func (s *authService) GenerateTokens(userID string, role string) (string, string, error) {
	accessClaims := jwt.MapClaims{
		"sub":  userID,
		"role": role,
		"exp":  time.Now().Add(15 * time.Minute).Unix(),
		"iat":  time.Now().Unix(),
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessString, err := accessToken.SignedString(s.jwtSecret)
	if err != nil {
		return "", "", err
	}

	refreshClaims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshString, err := refreshToken.SignedString(s.jwtSecret)
	if err != nil {
		return "", "", err
	}

	return accessString, refreshString, nil
}
