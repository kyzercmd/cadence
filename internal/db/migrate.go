package db

import (
	"context"
	"log"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kyzercmd/cadence/migrations"
)

func Migrate(ctx context.Context, db *pgxpool.Pool) error {
	stmt := `
			CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP 
			)
			`
	_, err := db.Exec(ctx, stmt)
	if err != nil {
		return err
	}

	entries, err := migrations.FS.ReadDir(".")
	if err != nil {
		return err
	}

	var filenames []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			filenames = append(filenames, e.Name())
		}
	}
	sort.Strings(filenames)

	rows, err := db.Query(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return err
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return err
		}
		applied[version] = true
	}
	if err = rows.Err(); err != nil {
		return err
	}

	for _, filename := range filenames {
		if applied[filename] {
			continue
		}

		content, err := migrations.FS.ReadFile(filename)
		if err != nil {
			return err
		}

		applyMigration(ctx, db, content, filename)
		log.Printf("Applied migrations: %v", filename)
	}

	return nil
}

func applyMigration(ctx context.Context, db *pgxpool.Pool, content []byte, filename string) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, string(content))
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", filename)
	if err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	return nil
}
