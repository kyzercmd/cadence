package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kyzercmd/cadence/internal/models"
)

type UserRepository interface {
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, ID string) (*models.User, error)
	CreateUser(ctx context.Context, user *models.User) error
	UpdateUser(ctx context.Context, user *models.User) error
	GetAllUsers(ctx context.Context) ([]*models.UserListResponse, error)
	GetHRAndAdminIDs(ctx context.Context) ([]string, error)
}

type postgresUserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) UserRepository {
	return &postgresUserRepository{db: db}
}

func (r *postgresUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	stmt := `
			SELECT id, name, email, password_hash, avatar_url, role, position, level, gender, birthday, company, location, mobile, skype, active FROM users WHERE email = $1
			`
	var u models.User

	row := r.db.QueryRow(ctx, stmt, email)

	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.AvatarURL, &u.Role, &u.Position, &u.Level, &u.Gender, &u.Birthday, &u.Company, &u.Location, &u.Mobile, &u.Skype, &u.Active)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, err
	}

	return &u, nil
}

func (r *postgresUserRepository) GetUserByID(ctx context.Context, ID string) (*models.User, error) {
	query := `
			SELECT id, name, email, password_hash, avatar_url, role, position, level, gender, birthday, company, location, mobile, skype, active FROM users WHERE id = $1
			`

	var u models.User

	err := r.db.QueryRow(ctx, query, ID).Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.AvatarURL, &u.Role, &u.Position, &u.Level, &u.Gender, &u.Birthday, &u.Company, &u.Location, &u.Mobile, &u.Skype, &u.Active)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, models.ErrUserNotFound
		}
		return nil, err
	}

	return &u, nil
}

func (r *postgresUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	query := `
			INSERT INTO users (name, email, password_hash, avatar_url, role, position, level, gender, birthday, company, location, mobile, skype, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id
			`

	err := r.db.QueryRow(ctx, query, user.Name, user.Email, user.Password, user.AvatarURL, user.Role, user.Position, user.Level, user.Gender, user.Birthday, user.Company, user.Location, user.Mobile, user.Skype, user.Active).Scan(&user.ID)
	if err != nil {
		return err
	}

	return nil
}

func (r *postgresUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	query := `
			UPDATE users SET name = $1, email = $2, password_hash = $3, avatar_url = $4, role = $5, position = $6, level = $7, gender = $8, birthday = $9, company = $10, location = $11, mobile = $12, skype = $13, active = $14 WHERE id = $15
			`
	result, err := r.db.Exec(ctx, query, user.Name, user.Email, user.Password, user.AvatarURL, user.Role, user.Position, user.Level, user.Gender, user.Birthday, user.Company, user.Location, user.Mobile, user.Skype, user.Active, user.ID)
	if err != nil {
		return err
	}

	rowsEffected := result.RowsAffected()

	if rowsEffected == 0 {
		return models.ErrUserNotFound
	}

	return nil
}

func (r *postgresUserRepository) GetAllUsers(ctx context.Context) ([]*models.UserListResponse, error) {
	query := `
		SELECT id, name, email, avatar_url, role, position, level, active 
		FROM USERS ORDER BY role ASC, name ASC
		`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]*models.UserListResponse, 0)

	for rows.Next() {
		var u models.UserListResponse

		err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.AvatarURL, &u.Role, &u.Position, &u.Level, &u.Active)
		if err != nil {
			return nil, err
		}

		users = append(users, &u)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func (r *postgresUserRepository) GetHRAndAdminIDs(ctx context.Context) ([]string, error) {
	query := `
			SELECT id FROM users WHERE role IN ('hr', 'admin') AND active = true
			`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}

	var IDs = make([]string, 0)

	for rows.Next() {
		var id string

		err := rows.Scan(&id)
		if err != nil {
			return nil, err
		}

		IDs = append(IDs, id)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return IDs, nil
}
