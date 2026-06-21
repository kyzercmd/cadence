package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/kyzercmd/cadence/internal/models"
)

type UserRepository interface {
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, ID string) (*models.User, error)
	CreateUser(ctx context.Context, user *models.User) error
	UpdateUser(ctx context.Context, user *models.User) error
}

type postgresUserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &postgresUserRepository{db: db}
}

func (r *postgresUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	stmt := `
			SELECT id, name, email, password_hash, avatar_url, role, position, level, gender, birthday, company, location, mobile, skype, active FROM users WHERE email = $1
			`
	var u models.User
	var birthday time.Time

	row := r.db.QueryRowContext(ctx, stmt, email)

	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.AvatarURL, &u.Role, &u.Position, &u.Level, &u.Gender, &birthday, &u.Company, &u.Location, &u.Mobile, &u.Skype, &u.Active)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, err
	}

	u.Birthday = birthday.Format("2006-01-02")

	return &u, nil
}

func (r *postgresUserRepository) GetUserByID(ctx context.Context, ID string) (*models.User, error) {
	query := `
			SELECT id, name, email, password_hash, avatar_url, role, position, level, gender, birthday, company, location, mobile, skype, active FROM users WHERE id = $1
			`

	var u models.User
	var birthday time.Time

	err := r.db.QueryRowContext(ctx, query, ID).Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.AvatarURL, &u.Role, &u.Position, &u.Level, &u.Gender, &birthday, &u.Company, &u.Location, &u.Mobile, &u.Skype, &u.Active)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, err
	}
	u.Birthday = birthday.Format("2006-01-02")

	return &u, nil
}

func (r *postgresUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	query := `
			INSERT INTO users (name, email, password_hash, avatar_url, role, position, level, gender, birthday, company, location, mobile, skype, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id
			`
	parsedBirthday, err := time.Parse("2006-01-02", user.Birthday)
	if err != nil {
		return nil
	}

	err = r.db.QueryRowContext(ctx, query, user.Name, user.Email, user.Password, user.AvatarURL, user.Role, user.Position, user.Level, user.Gender, parsedBirthday, user.Company, user.Location, user.Mobile, user.Skype, user.Active).Scan(&user.ID)

	return err
}

func (r *postgresUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	query := `
			UPDATE users SET name = $1, email = $2, password_hash = $3, avatar_url = $4, role = $5, position = $6, level = $7, gender = $8, birthday = $9, company = $10, location = $11, mobile = $12, skype = $13, active = $14 WHERE id = $15
			`
	result, err := r.db.ExecContext(ctx, query, user.Name, user.Email, user.Password, user.AvatarURL, user.Role, user.Position, user.Level, user.Gender, user.Birthday, user.Company, user.Location, user.Mobile, user.Skype, user.Active, user.ID)
	if err != nil {
		return err
	}

	rowsEffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsEffected == 0 {
		return models.ErrUserNotFound
	}

	return nil
}
