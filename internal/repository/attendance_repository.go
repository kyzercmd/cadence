package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kyzercmd/cadence/internal/models"
)

type AttendanceRepository interface {
	ClockIn(ctx context.Context, userID string) (*models.AttendanceEntry, error)
	ClockOut(ctx context.Context, userID string) (*models.AttendanceEntry, error)
	GetTodayAttendance(ctx context.Context, userID string) (*models.AttendanceEntry, error)
}

type postgresAttendanceRepository struct {
	db *pgxpool.Pool
}

func NewAttendanceRepository(db *pgxpool.Pool) AttendanceRepository {
	return &postgresAttendanceRepository{db: db}
}

func (r *postgresAttendanceRepository) ClockIn(ctx context.Context, userID string) (*models.AttendanceEntry, error) {
	var existingID string

	checkQuery := `
				SELECT id FROM attendance_entries WHERE user_id = $1 AND date = CURRENT_DATE
				`
	err := r.db.QueryRow(ctx, checkQuery, userID).Scan(&existingID)
	if err == nil {
		return nil, models.ErrAlreadyClockedIn
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	insertQuery := `
					INSERT INTO attendance_entries (user_id, date, clock_in)
					VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP)
					RETURNING id, user_id, date, clock_in, clock_out, total_minutes
					`
	var entry models.AttendanceEntry

	err = r.db.QueryRow(ctx, insertQuery, userID).Scan(&entry.ID, &entry.UserID, &entry.Date, &entry.ClockIn, &entry.ClockOut, &entry.TotalMinutes)
	if err != nil {
		return nil, err
	}

	return &entry, nil
}

func (r *postgresAttendanceRepository) ClockOut(ctx context.Context, userID string) (*models.AttendanceEntry, error) {
	var entry models.AttendanceEntry

	fetchQeury := `
				SELECT id, clock_out FROM attendance_entries WHERE user_id = $1 AND date = CURRENT_DATE
				`
	err := r.db.QueryRow(ctx, fetchQeury, userID).Scan(&entry.ID, &entry.ClockOut)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, models.ErrHaveNotClockedIn
	} else if err != nil {
		return nil, err
	}

	if entry.ClockOut != nil {
		return nil, models.ErrAlreadyClockedOut
	}

	updateQuery := `
					UPDATE attendance_entries SET clock_out = CURRENT_TIMESTAMP,
					total_minutes = CAST(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - clock_in)) / 60 AS INTEGER)
					WHERE id = $1
					RETURNING id, user_id, date, clock_in, clock_out, total_minutes
					`
	var updatedEntry models.AttendanceEntry

	err = r.db.QueryRow(ctx, updateQuery, entry.ID).Scan(&updatedEntry.ID, &updatedEntry.UserID, &updatedEntry.Date, &updatedEntry.ClockIn, &updatedEntry.ClockOut, &updatedEntry.TotalMinutes)
	if err != nil {
		return nil, err
	}

	return &updatedEntry, nil
}

func (r *postgresAttendanceRepository) GetTodayAttendance(ctx context.Context, userID string) (*models.AttendanceEntry, error) {
	query := `
			SELECT id, user_id, date, clock_in, clock_out, total_minutes
			FROM attendance_entries WHERE user_id = $1 AND date = CURRENT_DATE
			`
	var entry models.AttendanceEntry

	err := r.db.QueryRow(ctx, query, userID).Scan(&entry.ID, &entry.UserID, &entry.Date, &entry.ClockIn, &entry.ClockOut, &entry.TotalMinutes)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &entry, nil
}
